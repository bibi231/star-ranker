/**
 * Epoch Scheduler — Auto-rolls epochs and triggers settlement.
 * 
 * Checks every 30 seconds if the active epoch has ended.
 * When it does: creates a new epoch and settles expired stakes.
 */

import { db } from "../db/index";
import { epochs, marketActivity } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { settleBets } from "./settlement";
import { reifyRankings, createEpochSnapshot } from "./rankingEngine";

const CHECK_INTERVAL = 30_000;  // Check every 30 seconds
const EPOCH_DURATION = 30 * 60 * 1000; // 30 minutes

export async function checkAndRollEpoch() {
    try {
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
                // Capture final rankings for this epoch
                await createEpochSnapshot(current.epochNumber);

                // Settle stakes from expired epoch
                await settleBets();

                // Force a global ranking reification immediately
                await reifyRankings();

                // Create new epoch
                await createNewEpoch(current.epochNumber + 1);

                // Log transition
                await db.insert(marketActivity).values({
                    type: "epoch_roll",
                    description: `Epoch #${current.epochNumber} closed. Sequence advanced to #${current.epochNumber + 1}.`,
                    metadata: { oldEpoch: current.epochNumber, newEpoch: current.epochNumber + 1 }
                });

                console.log(`[Epoch] Rolled to epoch ${current.epochNumber + 1}`);
            } catch (err) {
                console.error(`[Epoch] Failed during rollover operations for #${current.epochNumber}:`, err);
                // System will retry on next check since no "active" epoch exists now
            }
        }
    } catch (error) {
        console.error("[Epoch] Rollover check failed:", error);
    }
}

async function createNewEpoch(epochNumber: number) {
    const now = new Date();
    const mins = now.getMinutes();

    // Align to GMT boundaries (:00 or :30)
    const startTime = new Date(now);
    startTime.setMinutes(mins < 30 ? 0 : 30, 0, 0);

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
