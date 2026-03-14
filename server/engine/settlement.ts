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

import { db } from "../db/index";
import { stakes, items, users, notifications, transactions, platformRevenue } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail, templates } from "../lib/email";

export async function settleBets() {
    console.log("[Settlement] Starting pool-based settlement...");

    // Find all unsettled active stakes
    const unsettled = await db
        .select({
            stake: stakes,
            userEmail: users.email,
        })
        .from(stakes)
        .innerJoin(users, eq(stakes.userId, users.firebaseUid))
        .where(and(
            eq(stakes.isSettled, false),
            eq(stakes.status, "active")
        ));

    if (unsettled.length === 0) {
        console.log("[Settlement] No stakes to settle.");
        return { settled: 0, poolSize: 0, totalPaid: 0, platformExtra: 0 };
    }

    // ===== PHASE 1: Determine winners and losers =====
    const results: Array<{
        stake: typeof unsettled[0]['stake'];
        userEmail: string | null;
        isWin: boolean;
        targetPayout: number;
    }> = [];

    for (const row of unsettled) {
        const { stake } = row;

        const itemResult = await db
            .select({ rank: items.rank })
            .from(items)
            .where(eq(items.docId, stake.itemDocId))
            .limit(1);

        if (itemResult.length === 0) continue;

        const actualRank = itemResult[0].rank ?? 999;
        let isWin = false;

        const target: any = stake.target;

        if (stake.betType === "exact") {
            const targetVal = typeof target === 'number' ? target : parseInt(target);
            isWin = actualRank === targetVal;
        } else if (stake.betType === "range") {
            // Target is {min, max}
            isWin = actualRank >= target.min && actualRank <= target.max;
        } else if (stake.betType === "directional") {
            // Target is {dir: 'up'|'down', k: number}
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
    }

    console.log(`[Settlement] === EPOCH SUMMARY ===`);
    console.log(`  Epoch ID:       ${currentEpochId}`);
    console.log(`  Stakes settled: ${settledCount}`);
    console.log(`  Total Stake:    ${totalGrossStaked.toFixed(2)}`);
    console.log(`  Total paid out: ${totalPaidOut.toFixed(2)}`);
    console.log(`  Platform Net:   ${netProfit.toFixed(2)}`);

    return { settled: settledCount, poolSize: totalGrossStaked, totalPaid: totalPaidOut, netProfit };
}
