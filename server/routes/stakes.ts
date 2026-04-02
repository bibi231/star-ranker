import { Router } from "express";
import { db } from "../db/index";
import { stakes, items, epochs, marketMeta, users, transactions, notifications, marketActivity, adminConfig } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireStakeAccess } from "../middleware/geo";
import { z } from "zod";
import { cacheDel } from "../services/cache";

const stakeSchema = z.object({
    itemDocId: z.string().min(1).max(200),
    amount: z.number().positive().min(1).max(1000000),
    target: z.union([z.number().int().positive(), z.object({ min: z.number(), max: z.number() }), z.object({ dir: z.string(), k: z.number() })]),
    categorySlug: z.string().min(1).max(50),
    itemName: z.string().min(1).max(200),
    betType: z.enum(["exact", "range", "directional"]),
    quotedEpoch: z.number().int().optional(), // For stale quote rejection
    isPlayMode: z.boolean().optional().default(false),
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
    stakeAmountUsd: number
) {
    const rawMultiplier = 1 / pBase;
    const BASE_LIQUIDITY = 5000; // $5k USD base dampening floor
    const totalLiquidity = Math.max(BASE_LIQUIDITY, market.totalEscrow + stakeAmountUsd);

    // Slippage scales based on your size relative to the pool or the base floor
    const slippage = (stakeAmountUsd / totalLiquidity) * market.liquidityFactor;

    const adjustedMultiplier = rawMultiplier * (1 - slippage) * (1 - config.platformMargin);
    const effectiveMultiplier = Math.min(config.maxMultiplier, Math.max(1.05, adjustedMultiplier));

    return {
        probability: pBase,
        multiplier: rawMultiplier,
        effectiveMultiplier,
        slippage,
        potentialPayout: stakeAmountUsd * effectiveMultiplier,
        maxPayout: stakeAmountUsd * config.maxMultiplier,
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

        // Update quest progress
        try {
            await db.execute(sql`
                INSERT INTO daily_quests (user_id, quest_date, staked_today)
                VALUES (${req.uid}, CURRENT_DATE, true)
                ON CONFLICT (user_id, quest_date)
                DO UPDATE SET staked_today = true
            `);
        } catch (questErr) {
            console.error("Stake quest update failed:", questErr);
        }

        res.json(quote);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/stakes — Place a stake
router.post("/", requireAuth, requireStakeAccess, async (req: AuthRequest, res: any) => {
    try {
        // ===== CHECK KILLSWITCH =====
        const adminState = await db.select().from(adminConfig).where(eq(adminConfig.key, 'global_state')).limit(1);
        if (adminState[0]?.killswitch) {
            return res.status(403).json({ error: "Trading is currently halted globally." });
        }

        console.log("[STAKE_POST] Request Body:", req.body);
        // ===== ZOD VALIDATION =====
        const parsed = stakeSchema.safeParse(req.body);
        if (!parsed.success) {
            console.error("[STAKE_POST] Validation failed:", parsed.error.flatten().fieldErrors);
            return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
        }
        const { itemDocId, amount, target, categorySlug, itemName, betType, quotedEpoch, isPlayMode } = parsed.data;
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

        // Fetched user earlier, now check for demo mode
        const isDemo = user.isDemoMode === true || req.body.isDemo === true;

        if (isDemo) {
            // Demo mode handling — bypass real-money logic
            if ((user.demoBalance || 0) < amount) {
                return res.status(400).json({ 
                    error: 'Insufficient demo credits',
                    isDemoError: true,
                    currentDemoBalance: user.demoBalance || 0
                });
            }

            // Fetch current epoch for demo stake
            const demoEpochResult = await db.select().from(epochs).where(eq(epochs.isActive, true)).limit(1);
            if (demoEpochResult.length === 0) return res.status(400).json({ error: "No active epoch" });
            const demoEpoch = demoEpochResult[0];

            // Deduct from demo balance
            await db.update(users)
                .set({ 
                    demoBalance: (user.demoBalance || 0) - amount,
                    demoStakesCount: (user.demoStakesCount || 0) + 1,
                    demoTotalStaked: (user.demoTotalStaked || 0) + amount,
                })
                .where(eq(users.firebaseUid, userId));
            
            // Insert stake marked as demo
            const [newDemoStake] = await db.insert(stakes).values({
                userId,
                itemDocId,
                itemName,
                categorySlug,
                amount: netStake,
                platformFee,
                target: target as any,
                betType,
                initialRank: 50, // Fallback rank for demo
                status: 'active',
                epochId: demoEpoch.epochNumber,
                isDemo: true,
                isPlayMode: true, // Also mark as play mode for UI compatibility
            }).returning();

            return res.json({ 
                success: true, 
                stake: newDemoStake,
                isDemo: true,
                newDemoBalance: (user.demoBalance || 0) - amount,
                message: 'Demo stake placed! This is practice — no real money involved.'
            });
        }

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



        if (isPlayMode) {
            if ((user.playBalance ?? 0) < amount) {
                return res.status(400).json({ error: "Insufficient practice funds (STARS)" });
            }
        } else {
            if ((user.balance ?? 0) < amount) {
                return res.status(400).json({ error: "Insufficient funds" });
            }

            if ((Number(user.balance) - amount) < 1.0) {
                return res.status(400).json({ error: "Must maintain a minimum balance of $1.00 USD" });
            }
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

            if (isPlayMode) {
                if ((activeUser[0].playBalance ?? 0) < amount) throw new Error("Insufficient practice funds (race condition)");
                // 2. Deduct from playBalance
                await tx.update(users)
                    .set({ playBalance: sql`${users.playBalance} - ${amount}` })
                    .where(eq(users.firebaseUid, userId));
            } else {
                if ((activeUser[0].balance ?? 0) < amount) throw new Error("Insufficient funds (race condition)");
                // 2. Deduct FULL amount from user balance
                await tx.update(users)
                    .set({ balance: sql`${users.balance} - ${amount}` })
                    .where(eq(users.firebaseUid, userId));
            }

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
                isPlayMode,
            }).returning({ id: stakes.id });

            // 7. Log to Market Activity (safe fetch)
            try {
                await tx.insert(marketActivity).values({
                    type: "stake",
                    userId,
                    itemDocId,
                    itemName,
                    categorySlug,
                    amount,
                    description: `Oracle deployed influence on ${itemName} (Stake prediction)`,
                    metadata: { betType, target, multiplier: quote.effectiveMultiplier }
                });
            } catch (e) {
                console.warn("[Staking] Market activity log failed (possibly missing table):", e);
            }

            return stakeResult[0].id;
        });

        // Invalidate cache for this category
        await cacheDel(`items:${categorySlug}`);

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

/**
 * POST /api/stakes/:id/exit — Early Exit (Cash Out)
 */
router.post("/:id/exit", requireAuth, async (req: AuthRequest, res: any) => {
    try {
        const { id } = req.params;
        const userId = req.uid!;

        // 1. Fetch stake and verify ownership
        const stakeResult = await db.select().from(stakes).where(and(eq(stakes.id, parseInt(id)), eq(stakes.userId, userId))).limit(1);
        if (stakeResult.length === 0) return res.status(404).json({ error: "Stake not found" });
        const stake = stakeResult[0];

        if (stake.status !== "active") return res.status(400).json({ error: "Stake is not active" });

        // 2. Fetch current market rank
        const itemResult = await db.select().from(items).where(eq(items.docId, stake.itemDocId)).limit(1);
        if (itemResult.length === 0) return res.status(404).json({ error: "Market data lost" });
        const item = itemResult[0];
        const actualRank = item.rank || 50;

        // 3. Current win status
        let isWin = false;
        const target: any = stake.target;

        if (stake.betType === "exact") {
            const targetRankValue = typeof target === 'number' ? target : parseInt(target);
            isWin = actualRank === targetRankValue;
        } else if (stake.betType === "range") {
            isWin = actualRank >= target.min && actualRank <= target.max;
        } else if (stake.betType === "directional") {
            const initial = stake.initialRank || 50;
            if (target.dir === 'up') {
                isWin = actualRank <= (initial - (target.k || 1));
            } else {
                isWin = actualRank >= (initial + (target.k || 1));
            }
        }

        // 4. Calculate Exit Value
        // Winning Exit: 70% of potential payout (30% Haircut)
        // Losing Exit: 40% of original stake (60% Loss)
        let exitValue = 0;
        if (isWin) {
            const potentialPayout = stake.amount * (stake.effectiveMultiplier || 2);
            exitValue = potentialPayout * 0.7;
        } else {
            exitValue = stake.amount * 0.4;
        }

        exitValue = Math.floor(exitValue * 100) / 100;

        // 5. ATOMIC TRANSACTION
        await db.transaction(async (tx) => {
            // Update stake status
            await tx.update(stakes).set({
                status: "exited",
                exitValue,
                exitAt: new Date(),
                isSettled: true
            }).where(eq(stakes.id, stake.id));

            // Update user balance
            if (stake.isPlayMode) {
                await tx.update(users).set({ 
                    playBalance: sql`${users.playBalance} + ${exitValue}` 
                }).where(eq(users.firebaseUid, userId));
            } else {
                await tx.update(users).set({ 
                    balance: sql`${users.balance} + ${exitValue}` 
                }).where(eq(users.firebaseUid, userId));
            }

            // Log transaction
            const txRef = `ext_${Date.now()}_${stake.id}`;
            await tx.insert(transactions).values({
                userId,
                type: "exit",
                amountUsd: exitValue,
                netAmountUsd: exitValue,
                status: "completed",
                reference: txRef,
                epochId: stake.epochId,
                marketId: stake.itemDocId,
                metadata: { stakeId: stake.id, isWin, originalAmount: stake.amount }
            });

            // Log activity
            try {
                await tx.insert(marketActivity).values({
                    type: "exit",
                    userId,
                    itemDocId: stake.itemDocId,
                    itemName: stake.itemName,
                    categorySlug: stake.categorySlug,
                    amount: exitValue,
                    description: `Oracle liquidated influence on ${stake.itemName} early (Exit realized)`,
                    metadata: { win: isWin, realized: exitValue }
                });
            } catch (e) {
                console.warn("[Exit] Activity log failed:", e);
            }
        });

        res.json({
            success: true,
            exitValue,
            isWin
        });
    } catch (error: any) {
        console.error("Early Exit error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
