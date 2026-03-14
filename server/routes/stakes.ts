import { Router } from "express";
import { db } from "../db/index";
import { stakes, items, epochs, marketMeta, users, transactions, notifications, marketActivity } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireStakeAccess } from "../middleware/geo";
import { z } from "zod";

const stakeSchema = z.object({
    itemDocId: z.string().min(1).max(200),
    amount: z.number().positive().min(1).max(1000000),
    target: z.union([z.number().int().positive(), z.object({ min: z.number(), max: z.number() }), z.object({ dir: z.string(), k: z.number() })]),
    categorySlug: z.string().min(1).max(50),
    itemName: z.string().min(1).max(200),
    betType: z.enum(["exact", "range", "directional"]),
    quotedEpoch: z.number().int().optional(), // For stale quote rejection
});

const router = Router();

/**
 * DMAO Odds Calculation (ported from Cloud Functions)
 */
function calculateBaseProbability(
    physics: { momentum: number; velocity: number; volatility: number; currentRank: number },
    target: any,
    betType: string,
    timeRemaining: number
): number {
    const { momentum, velocity, volatility, currentRank } = physics;

    let targetRankValue = 50;
    if (betType === "exact") {
        targetRankValue = typeof target === 'number' ? target : parseInt(target);
    } else if (betType === "range") {
        const mid = (target.min + target.max) / 2;
        targetRankValue = mid;
    } else if (betType === "directional") {
        targetRankValue = target.dir === 'up' ? currentRank - (target.k || 1) : currentRank + (target.k || 1);
    }

    const rankDelta = Math.abs(targetRankValue - currentRank);

    let pBase: number;
    if (betType === "exact") {
        pBase = Math.max(0.01, 0.5 * Math.exp(-rankDelta * 0.15));
    } else if (betType === "range") {
        // Ranges have higher probability than exact numbers
        pBase = Math.max(0.05, 0.7 * Math.exp(-rankDelta * 0.08));
    } else {
        // directional
        const movingRight = (target.dir === 'up' && velocity < 0) || (target.dir === 'down' && velocity > 0);
        pBase = movingRight
            ? Math.min(0.85, 0.5 + Math.abs(velocity) * 0.02 + momentum * 0.01)
            : Math.max(0.05, 0.3 - Math.abs(velocity) * 0.01);
    }

    // Time decay
    const hoursLeft = timeRemaining / 3600000;
    if (hoursLeft < 0.5) pBase *= 1.1;

    // Volatility adjustment
    pBase *= (1 + volatility * 0.01);

    return Math.min(0.95, Math.max(0.01, pBase));
}

function generateOddsQuote(
    pBase: number,
    market: { totalEscrow: number; itemOpenInterest: number; liquidityFactor: number },
    config: { safetyRatio: number; platformMargin: number; maxMultiplier: number },
    stakeAmount: number
) {
    const rawMultiplier = 1 / pBase;
    const slippage = stakeAmount / Math.max(1, market.totalEscrow + stakeAmount) * market.liquidityFactor;
    const adjustedMultiplier = rawMultiplier * (1 - slippage) * (1 - config.platformMargin);
    const effectiveMultiplier = Math.min(config.maxMultiplier, Math.max(1.01, adjustedMultiplier));

    return {
        probability: pBase,
        multiplier: rawMultiplier,
        effectiveMultiplier,
        slippage,
        potentialPayout: stakeAmount * effectiveMultiplier,
        maxPayout: stakeAmount * config.maxMultiplier,
    };
}

// GET /api/stakes/odds — Get live odds quote
router.get("/odds", [requireAuth, requireStakeAccess], async (req: AuthRequest, res: any) => {
    try {
        console.log("[STAKE_ODDS] Request Query:", req.query);
        const { itemDocId, amount, target, categorySlug, betType } = req.query;

        if (!itemDocId || !amount || !target || !categorySlug || !betType) {
            console.warn("[STAKE_ODDS] Missing required params:", { itemDocId, amount, target, categorySlug, betType });
            return res.status(400).json({ error: "Missing required params" });
        }

        // Fetch item
        const itemResult = await db.select().from(items).where(eq(items.docId, itemDocId as string)).limit(1);
        if (itemResult.length === 0) return res.status(404).json({ error: "Item not found" });
        const item = itemResult[0];

        // Fetch market meta
        const metaResult = await db.select().from(marketMeta).where(eq(marketMeta.categorySlug, categorySlug as string)).limit(1);
        const meta = metaResult[0] || { totalStaked: 0, itemExposure: {} };
        const itemOI = ((meta.itemExposure as any) || {})[itemDocId as string] || 0;

        // Fetch epoch
        const epochResult = await db.select().from(epochs).where(eq(epochs.isActive, true)).limit(1);
        if (epochResult.length === 0) return res.status(400).json({ error: "No active epoch" });
        const timeRemaining = epochResult[0].endTime.getTime() - Date.now();

        let parsedTarget: any = target;
        try {
            // Attempt to parse JSON if it's a stringified object (from frontend apiGet)
            if (typeof target === "string" && (target.startsWith("{") || target.startsWith("["))) {
                parsedTarget = JSON.parse(target);
            } else if (typeof target === "string") {
                parsedTarget = parseInt(target);
            }
        } catch (e) {
            parsedTarget = parseInt(target as string);
        }

        const pBase = calculateBaseProbability(
            {
                momentum: item.momentum ?? 0,
                velocity: item.velocity ?? 0,
                volatility: item.volatility ?? 5,
                currentRank: item.rank ?? 50,
            },
            parsedTarget,
            betType as string,
            timeRemaining
        );

        const quote = generateOddsQuote(
            pBase,
            { totalEscrow: meta.totalStaked ?? 0, itemOpenInterest: itemOI, liquidityFactor: 0.5 },
            { safetyRatio: 0.1, platformMargin: 0.04, maxMultiplier: 8 },
            parseFloat(amount as string)
        );

        res.json(quote);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/stakes — Place a stake
router.post("/", requireAuth, requireStakeAccess, async (req: AuthRequest, res: any) => {
    try {
        console.log("[STAKE_POST] Request Body:", req.body);
        // ===== ZOD VALIDATION =====
        const parsed = stakeSchema.safeParse(req.body);
        if (!parsed.success) {
            console.error("[STAKE_POST] Validation failed:", parsed.error.flatten().fieldErrors);
            return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
        }
        const { itemDocId, amount, target, categorySlug, itemName, betType, quotedEpoch } = parsed.data;
        const userId = req.uid!;

        // ===== PLATFORM FEE CONFIG =====
        let PLATFORM_FEE_RATE = 0.05; // 5% fee on every stake
        let referralFee = 0;
        let powerReferrer = null;

        // Fetch user early to determine fees
        const userResult = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
        if (userResult.length === 0) return res.status(404).json({ error: "User not found" });
        const user = userResult[0];

        if (user.referredBy) {
            powerReferrer = user.referredBy;
            PLATFORM_FEE_RATE -= 0.01; // 4% platform, 1% referral
            referralFee = amount * 0.01;
        }

        const platformFee = amount * PLATFORM_FEE_RATE;
        const netStake = amount - platformFee - referralFee; // Amount that enters the risk pool

        // Fetch epoch
        const epochResult = await db.select().from(epochs).where(eq(epochs.isActive, true)).limit(1);
        if (epochResult.length === 0) return res.status(400).json({ error: "No active epoch" });
        const epoch = epochResult[0];

        // 120s lockout (server-enforced)
        const timeRemaining = epoch.endTime.getTime() - Date.now();
        console.log(`[Stakes] Epoch ${epoch.epochNumber} - Time remaining: ${Math.round(timeRemaining / 1000)}s`);

        if (timeRemaining < 120000) {
            return res.status(400).json({ error: "Market is locked for snapshot (120s window)" });
        }

        // Stale quote rejection: if user quoted on a different epoch, reject
        if (quotedEpoch && quotedEpoch !== epoch.epochNumber) {
            return res.status(409).json({ error: "Epoch changed since your quote — refresh odds" });
        }



        if ((user.balance ?? 0) < amount) {
            return res.status(400).json({ error: "Insufficient funds" });
        }

        // Fetch item
        const itemResult = await db.select().from(items).where(eq(items.docId, itemDocId)).limit(1);
        if (itemResult.length === 0) return res.status(404).json({ error: "Item not found" });
        const item = itemResult[0];

        // Fetch meta
        const metaResult = await db.select().from(marketMeta).where(eq(marketMeta.categorySlug, categorySlug)).limit(1);
        const meta = metaResult[0] || { totalStaked: 0, itemExposure: {}, platformRevenue: 0 };
        const exposure = (meta.itemExposure as Record<string, number>) || {};
        const itemOI = exposure[itemDocId] || 0;


        const pBase = calculateBaseProbability(
            { momentum: item.momentum ?? 0, velocity: item.velocity ?? 0, volatility: item.volatility ?? 5, currentRank: item.rank ?? 50 },
            target, betType, timeRemaining
        );

        const quote = generateOddsQuote(
            pBase,
            { totalEscrow: meta.totalStaked ?? 0, itemOpenInterest: itemOI, liquidityFactor: 0.5 },
            { safetyRatio: 0.1, platformMargin: 0.04, maxMultiplier: 8 },
            netStake
        );

        // ===== ATOMIC TRANSACTION: Debit User + Credit Referrer + Update Meta + Log Transaction + Create Stake =====
        const stakeId = await db.transaction(async (tx) => {
            // 1. Re-fetch user balance within transaction for absolute consistency
            const activeUser = await tx.select().from(users).where(eq(users.firebaseUid, userId)).limit(1).for("update");
            if (activeUser.length === 0) throw new Error("User lost during transaction");
            if ((activeUser[0].balance ?? 0) < amount) throw new Error("Insufficient funds (race condition)");

            // 2. Deduct FULL amount from user
            await tx.update(users)
                .set({ balance: sql`${users.balance} - ${amount}` })
                .where(eq(users.firebaseUid, userId));

            // 3. Credit referrer if applicable
            if (powerReferrer && referralFee > 0) {
                await tx.update(users)
                    .set({
                        balance: sql`${users.balance} + ${referralFee}`,
                        referralEarnings: sql`${users.referralEarnings} + ${referralFee}`
                    })
                    .where(eq(users.referralCode, powerReferrer));
            }

            // 4. Update market pool
            const newExposure = { ...exposure, [itemDocId]: itemOI + netStake };
            await tx.update(marketMeta)
                .set({
                    totalStaked: sql`${marketMeta.totalStaked} + ${netStake}`,
                    platformRevenue: sql`${marketMeta.platformRevenue} + ${platformFee}`,
                    itemExposure: newExposure,
                })
                .where(eq(marketMeta.categorySlug, categorySlug));

            // 5. Create Ledger Entry (Transaction)
            const txRef = `stk_${Date.now()}_${userId.slice(-4)}`;
            await tx.insert(transactions).values({
                userId,
                type: "stake",
                amountUsd: netStake,
                platformFeeUsd: platformFee,
                netAmountUsd: -amount, // Impact on balance is negative
                reference: txRef,
                status: "completed",
                epochId: epoch.epochNumber,
                marketId: itemDocId,
                metadata: { betType, target, itemName }
            });

            // 6. Create Stake Record
            const stakeResult = await tx.insert(stakes).values({
                userId,
                itemDocId,
                itemName,
                categorySlug,
                amount: netStake,
                target: target as any,
                betType,
                initialRank: item.rank ?? 50,
                status: "active",
                epochId: epoch.epochNumber,
                impliedProbability: quote.probability,
                effectiveMultiplier: quote.effectiveMultiplier,
                multiplierUsed: quote.multiplier,
                slippageApplied: quote.slippage,
                platformFee,
            }).returning({ id: stakes.id });

            // 7. Log to Market Activity
            await tx.insert(marketActivity).values({
                type: "stake",
                userId,
                itemDocId,
                itemName,
                categorySlug,
                amount,
                description: `Stake of ${amount.toFixed(2)} placed on ${itemName} (Epoch #${epoch.epochNumber})`,
                metadata: { betType, target, multiplier: quote.effectiveMultiplier }
            });

            return stakeResult[0].id;
        });

        res.json({
            success: true,
            stakeId,
            fee: platformFee,
            netStake,
            potentialPayout: quote.potentialPayout
        });
    } catch (error: any) {
        console.error("Stake error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/stakes/mine — Get user's active stakes
router.get("/my", requireAuth, async (req: AuthRequest, res: any) => {
    try {
        const result = await db
            .select()
            .from(stakes)
            .where(and(eq(stakes.userId, req.uid!), eq(stakes.status, "active")));

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
