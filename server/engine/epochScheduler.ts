/**
 * Epoch Scheduler — Auto-rolls epochs and triggers settlement.
 * 
 * HARDENED: Includes concurrent execution guard to prevent double-settlement.
 * Checks every 30 seconds if the active epoch has ended.
 * When it does: snapshots opening ranks for the new epoch, settles the old one.
 */

import { db } from "../db/index.js";
import { epochs, marketActivity } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { settleBets } from "./settlement.js";
import { reifyRankings, createEpochSnapshot, snapshotOpeningRanks } from "./rankingEngine.js";

const CHECK_INTERVAL = 30_000;  // Check every 30 seconds
const EPOCH_DURATION = 30 * 60 * 1000; // 30 minutes

// ===== CONCURRENT EXECUTION GUARD =====
// Prevents double-settlement if the scheduler fires twice under heavy load
let settlementInProgress = false;

export async function checkAndRollEpoch() {
    if (settlementInProgress) {
        console.warn('[Epoch] Settlement already in progress — skipping cycle');
        return;
    }

    try {
        settlementInProgress = true;

        const activeEpochs = await db
            .select()
            .from(epochs)
            .where(eq(epochs.isActive, true))
            .limit(1);

        const now = Date.now();

        if (activeEpochs.length === 0) {
            console.log("[Epoch] No active epoch found. Finding last epoch number...");
            const lastEpoch = await db.select().from(epochs).orderBy(desc(epochs.epochNumber)).limit(1);
            const nextNum = lastEpoch.length > 0 ? lastEpoch[0].epochNumber + 1 : 1;
            console.log(`[Epoch] Starting new epoch sequence from #${nextNum}`);
            await createNewEpoch(nextNum);
            return;
        }

        const current = activeEpochs[0];

        if (now >= current.endTime.getTime()) {
            console.log(`[Epoch] Epoch ${current.epochNumber} expired. Rolling over...`);

            // Mark current as inactive
            await db.update(epochs)
                .set({ isActive: false })
                .where(eq(epochs.id, current.id));

            try {
                // Capture CLOSING rankings for this epoch
                await createEpochSnapshot(current.epochNumber);

                // Settle stakes from expired epoch
                await settleBets(current.epochNumber);

                // Force a global ranking reification immediately
                await reifyRankings();

                // Create new epoch
                const nextEpochNum = current.epochNumber + 1;
                await createNewEpoch(nextEpochNum);

                // Snapshot OPENING ranks for the new epoch
                await snapshotOpeningRanks(nextEpochNum);

                // Log transition
                await db.insert(marketActivity).values({
                    type: "epoch_roll",
                    description: `Epoch #${current.epochNumber} closed. Sequence advanced to #${nextEpochNum}.`,
                    metadata: { oldEpoch: current.epochNumber, newEpoch: nextEpochNum }
                });

                console.log(`[Epoch] Rolled to epoch ${nextEpochNum}`);
            } catch (err) {
                console.error(`[Epoch] Failed during rollover operations for #${current.epochNumber}:`, err);
                // System will retry on next check since no "active" epoch exists now
            }
        }
    } catch (error) {
        console.error("[Epoch] Rollover check failed:", error);
    } finally {
        settlementInProgress = false;
    }
}

async function createNewEpoch(epochNumber: number) {
    const now = new Date();
    const utcMins = now.getUTCMinutes();

    // Align to GMT boundaries (:00 or :30)
    const startTime = new Date(now);
    startTime.setUTCHours(now.getUTCHours(), utcMins < 30 ? 0 : 30, 0, 0);

    const endTime = new Date(startTime.getTime() + EPOCH_DURATION);

    console.log(`[Epoch] Creating synchronized epoch #${epochNumber}: ${startTime.toISOString()} -> ${endTime.toISOString()}`);

    await db.insert(epochs).values({
        epochNumber,
        isActive: true,
        startTime,
        endTime,
        duration: EPOCH_DURATION,
    });
}

export function startEpochScheduler() {
    console.log(`⏱️  Epoch scheduler started (check every ${CHECK_INTERVAL / 1000}s, epoch duration: ${EPOCH_DURATION / 60000}min)`);

    // Check immediately
    setTimeout(() => checkAndRollEpoch().catch(console.error), 3000);

    // Then check periodically
    setInterval(() => {
        checkAndRollEpoch().catch(console.error);
    }, CHECK_INTERVAL);
}
