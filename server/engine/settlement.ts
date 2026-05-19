/**
 * Settlement Oracle — Pool-Based Payout System
 * 
 * REVENUE MODEL:
 * 1. Platform takes 5% fee on every stake placement (already deducted)
 * 2. Losers' stakes form the "payout pool"
 * 3. Winners split the loser pool proportional to their (stake × multiplier)
 * 4. If the pool can't cover all payouts, payouts are scaled down (never from platform pocket)
 * 5. Any leftover pool goes to platform as additional revenue
 */

import { db } from "../db/index.js";
import { stakes, items, users, notifications, transactions, platformRevenue, marketActivity, epochSnapshots } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail, templates } from "../lib/email.js";
import { checkAndAwardAchievements } from "../services/achievements.js";
import { cacheDelPattern } from "../services/cache.js";

export async function settleBets(epochId?: number) {
    if (epochId) {
        // Idempotency Check
        const existingSummary = await db.select().from(marketActivity).where(and(
            eq(marketActivity.type, "settlement"),
            sql`${marketActivity.metadata}->>'epochId' = ${epochId.toString()}`
        )).limit(1);

        if (existingSummary.length > 0) {
            console.log(`[Settlement] Epoch #${epochId} already settled. Skipping.`);
            return { settled: 0, poolSize: 0, totalPaid: 0, platformExtra: 0 };
        }
    }

    console.log(`[Settlement] Starting pool-based settlement for epoch #${epochId || 'LIVE'}...`);

    // Find all unsettled stakes for THIS epoch (or all unsettled if no epochId given)
    const unsettled = await db
        .select({
            stake: stakes,
            userEmail: users.email,
        })
        .from(stakes)
        .innerJoin(users, eq(stakes.userId, users.firebaseUid))
        .where(and(
            eq(stakes.isSettled, false),
            eq(stakes.status, "active"),
            epochId ? eq(stakes.epochId, epochId) : sql`TRUE`
        ));

    if (unsettled.length === 0) {
        console.log("[Settlement] No stakes to settle.");
        // We still check for demo stakes below...
    }

    const results: Array<{
        stake: typeof unsettled[0]['stake'];
        userEmail: string | null;
        isWin: boolean;
        targetPayout: number;
    }> = [];

    for (const row of unsettled) {
        const { stake } = row;

        // Use snapshot if epochId is provided, otherwise fallback to live items
        const rankSource = epochId ? 
            await db.select({ rank: epochSnapshots.rank }).from(epochSnapshots).where(and(eq(epochSnapshots.epochId, epochId), eq(epochSnapshots.itemId, stake.itemDocId))).limit(1) :
            await db.select({ rank: items.rank }).from(items).where(eq(items.docId, stake.itemDocId)).limit(1);

        if (rankSource.length === 0) continue;

        const actualRank = rankSource[0].rank ?? 999;
        let isWin = false;
        const target: any = stake.target;

        if (stake.betType === "exact") {
            const targetVal = typeof target === 'number' ? target : parseInt(target);
            isWin = actualRank === targetVal;
        } else if (stake.betType === "range") {
            isWin = actualRank >= target.min && actualRank <= target.max;
        } else if (stake.betType === "directional") {
            const initial = stake.initialRank || 50;
            if (target.dir === 'up') {
                isWin = actualRank <= (initial - target.k);
            } else {
                isWin = actualRank >= (initial + target.k);
            }
        }

        const targetPayout = isWin ? stake.amount * (stake.effectiveMultiplier || 2) : 0;

        results.push({
            stake,
            userEmail: row.userEmail,
            isWin,
            targetPayout,
        });
    }

    // ===== PHASE 2: Calculate pool economics =====
    const loserPool = results
        .filter(r => !r.isWin)
        .reduce((sum, r) => sum + r.stake.amount, 0);

    const totalTargetPayouts = results
        .filter(r => r.isWin)
        .reduce((sum, r) => sum + r.targetPayout, 0);

    // Scale factor: if pool can't cover all payouts, scale down proportionally
    const scaleFactor = totalTargetPayouts > 0
        ? Math.min(1, loserPool / totalTargetPayouts)
        : 0;

    // ===== PHASE 3: Settle each stake =====
    let totalGrossStaked = 0;
    let totalPaidOut = 0;
    let totalFees = 0;
    let settledCount = 0;

    for (const result of results) {
        const { stake, userEmail, isWin, targetPayout } = result;
        const actualPayout = isWin ? Math.floor(targetPayout * scaleFactor * 100) / 100 : 0;
        totalGrossStaked += stake.amount;
        totalFees += (stake.platformFee || 0);

        await db.transaction(async (tx) => {
            // 1. Update stake record
            await tx.update(stakes).set({
                isSettled: true,
                status: isWin ? "won" : "lost",
                payout: actualPayout,
            }).where(eq(stakes.id, stake.id));

            // 2. Log in Transactions Ledger
            const txType = isWin ? "win" : "fee"; // Loser stake is kept as pool/fee
            const txRef = `stl_${Date.now()}_${stake.id}`;

            await tx.insert(transactions).values({
                userId: stake.userId,
                type: txType,
                amountUsd: isWin ? actualPayout : -stake.amount,
                netAmountUsd: isWin ? actualPayout + stake.amount : -stake.amount, // Winner gets winnings + stake back
                status: "completed",
                reference: txRef,
                epochId: stake.epochId,
                marketId: stake.itemDocId,
                metadata: { outcome: isWin ? "win" : "loss", stakeId: stake.id }
            });

            // 3. Credit winner's balance (payout + original stake back) or deduct reputaton
            if (isWin && actualPayout >= 0) {
                const totalCredit = actualPayout + stake.amount;
                await tx.update(users).set({
                    balance: sql`${users.balance} + ${totalCredit}`,
                    reputation: sql`${users.reputation} + 10`,
                }).where(eq(users.firebaseUid, stake.userId));
                totalPaidOut += actualPayout;
            } else {
                await tx.update(users).set({
                    reputation: sql`GREATEST(0, ${users.reputation} - 5)`,
                }).where(eq(users.firebaseUid, stake.userId));
            }

            // 4. Add in-app notification
            await tx.insert(notifications).values({
                userId: stake.userId,
                title: isWin ? "Oracle Alignment Successful" : "Market Divergence Detected",
                message: isWin
                    ? `Profit reified on ${stake.itemName || 'asset'}. +${actualPayout.toLocaleString()} units credited.`
                    : `Stake on ${stake.itemName || 'asset'} dissolved into the pool. -${stake.amount.toLocaleString()} units.`,
                type: isWin ? "win" : "loss"
            });
        });
        
        // After transaction and notification creation, check achievements non-blockingly
        checkAndAwardAchievements(stake.userId).catch(err => console.error("[Settlement] achievements check failed:", err));

        // Send settlement email (outside transaction)
        if (userEmail) {
            const template = templates.settlement(
                stake.itemName || "Unknown Asset",
                isWin ? actualPayout : -stake.amount,
                isWin
            );
            sendEmail(userEmail, template.subject, template.html)
                .catch(err => console.error("Settlement email failed:", err));
        }

        settledCount++;
    }

    // ===== PHASE 4: Platform Revenue Logging =====
    const netProfit = totalGrossStaked - totalPaidOut;
    const currentEpochId = results[0]?.stake.epochId || 0;

    if (currentEpochId > 0) {
        await db.insert(platformRevenue).values({
            epochId: currentEpochId,
            grossStakedUsd: totalGrossStaked,
            totalFeesUsd: totalFees,
            totalWinningsUsd: totalPaidOut,
            netProfitUsd: netProfit,
        }).onConflictDoUpdate({
            target: platformRevenue.epochId,
            set: {
                grossStakedUsd: totalGrossStaked,
                totalFeesUsd: totalFees,
                totalWinningsUsd: totalPaidOut,
                netProfitUsd: netProfit,
                recordedAt: new Date(),
            }
        });

        // Log to Market Activity
        await db.insert(marketActivity).values({
            type: "settlement",
            description: `Epoch #${currentEpochId} settlement complete. Staked: ${totalGrossStaked.toFixed(2)}, Paid: ${totalPaidOut.toFixed(2)}, Platform Net: ${netProfit.toFixed(2)}`,
            amount: totalGrossStaked,
            metadata: { epochId: currentEpochId, staked: totalGrossStaked, paid: totalPaidOut, net: netProfit }
        });
    }

    console.log(`[Settlement] === EPOCH SUMMARY ===`);
    console.log(`  Epoch ID:       ${currentEpochId}`);
    console.log(`  Stakes settled: ${settledCount}`);
    console.log(`  Total Stake:    ${totalGrossStaked.toFixed(2)}`);
    console.log(`  Total paid out: ${totalPaidOut.toFixed(2)}`);
    console.log(`  Platform Net:   ${netProfit.toFixed(2)}`);

    // Invalidate ALL items and public caches since epoch changed and scores/ranks settled
    await cacheDelPattern("items:*");
    await cacheDelPattern("categories");
    await cacheDelPattern("leaderboard_public");
    await cacheDelPattern("stats_public");

    // ===== PHASE 5: Demo Settlement (Parallel Stream) =====
    const demoStakesToSettle = await db.select().from(stakes).where(and(
        eq(stakes.epochId, currentEpochId),
        eq(stakes.isDemo, true),
        eq(stakes.status, 'active')
    ));

    const { checkAndRefillDemoBalance, checkAndShowConversionPrompt } = await import("../services/demoMode");

    for (const demoStake of demoStakesToSettle) {
        // Fetch closing rank for the demo item.
        // Prefer epoch snapshot (authoritative closing rank); fall back to live items.rank.
        let rankSource: any[] = [];
        if (currentEpochId > 0) {
            rankSource = await db.select({ rank: epochSnapshots.rank })
                .from(epochSnapshots)
                .where(and(eq(epochSnapshots.epochId, currentEpochId), eq(epochSnapshots.itemId, demoStake.itemDocId)))
                .limit(1);
        }
        if (rankSource.length === 0) {
            // Snapshot missing — read live rank from items table
            rankSource = await db.select({ rank: items.rank }).from(items).where(eq(items.docId, demoStake.itemDocId)).limit(1);
        }
        if (rankSource.length === 0) {
            // Item itself is gone — mark stake lost to avoid limbo
            await db.update(stakes).set({ status: 'lost', isSettled: true }).where(eq(stakes.id, demoStake.id));
            continue;
        }
        const finalRank = rankSource[0].rank ?? 999;

        const target: any = demoStake.target;
        let won = false;
        
        if (demoStake.betType === "exact") {
            won = finalRank === (typeof target === 'number' ? target : parseInt(target));
        } else if (demoStake.betType === "range") {
            won = finalRank >= target.min && finalRank <= target.max;
        } else if (demoStake.betType === "directional") {
            const initial = demoStake.initialRank || 50;
            if (target.dir === 'up') won = finalRank <= (initial - (target.k || 1));
            else won = finalRank >= (initial + (target.k || 1));
        }

        if (won) {
            // Virtual payout calculation
            // effectiveMultiplier might be null on legacy demo stakes — use a sensible default
            // based on implied probability if available, else 1.8x.
            let multiplier = demoStake.effectiveMultiplier;
            if (!multiplier || multiplier <= 0) {
                multiplier = demoStake.impliedProbability && demoStake.impliedProbability > 0
                    ? Math.min(8, (1 / demoStake.impliedProbability) * 0.95)
                    : 1.8;
            }
            const demoPayout = Math.floor(demoStake.amount * multiplier);
            
            await db.update(stakes)
                .set({ status: 'won', payout: demoPayout, isSettled: true })
                .where(eq(stakes.id, demoStake.id));
            
            // Credit demo balance
            await db.update(users)
                .set({
                    demoBalance: sql`${users.demoBalance} + ${demoPayout + demoStake.amount}`,
                    demoTotalWon: sql`${users.demoTotalWon} + ${demoPayout}`,
                    demoWinsCount: sql`${users.demoWinsCount} + 1`,
                })
                .where(eq(users.firebaseUid, demoStake.userId));
            
            // Create victory notification
            await db.insert(notifications).values({
                userId: demoStake.userId,
                type: 'demo_win',
                title: `Demo Victory! +₦${demoPayout.toLocaleString()}`,
                message: `You called it! In real mode, that ₦${demoPayout.toLocaleString()} would be yours. Deposit now to play for real.`,
                metadata: { demoPayout, isDemo: true, showConversion: true },
            });

            await checkAndShowConversionPrompt(demoStake.userId);
        } else {
            await db.update(stakes).set({ status: 'lost', isSettled: true }).where(eq(stakes.id, demoStake.id));
            
            // Refill credits if they ran dry
            await checkAndRefillDemoBalance(demoStake.userId);

            await db.insert(notifications).values({
                userId: demoStake.userId,
                type: 'demo_loss',
                title: 'Demo stake settled',
                message: "This one didn't go your way — but it's only practice! Try again with your remaining credits.",
            });
        }
    }

    return { settled: settledCount, poolSize: totalGrossStaked, totalPaid: totalPaidOut, netProfit };
}
