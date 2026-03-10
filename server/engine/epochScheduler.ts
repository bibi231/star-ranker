/**
 * Epoch Scheduler — Auto-rolls epochs and triggers settlement.
 * 
 * Checks every 30 seconds if the active epoch has ended.
 * When it does: creates a new epoch and settles expired stakes.
 */

import { db } from "../db/index";
import { epochs } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { settleBets } from "./settlement";

const CHECK_INTERVAL = 30_000;  // Check every 30 seconds
const EPOCH_DURATION = 30 * 60 * 1000; // 30 minutes

export async function checkAndRollEpoch() {
    try {
        const activeEpochs = await db
            .select()
            .from(epochs)
            .where(eq(epochs.isActive, true))
            .limit(1);

        if (activeEpochs.length === 0) {
            console.log("[Epoch] No active epoch — creating first one");
            await createNewEpoch(1);
            return;
        }

        const current = activeEpochs[0];
        const now = Date.now();

        if (now >= current.endTime.getTime()) {
            console.log(`[Epoch] Epoch ${current.epochNumber} expired. Rolling over...`);

            // Mark current as inactive
            await db.update(epochs)
                .set({ isActive: false })
                .where(eq(epochs.id, current.id));

            // Settle stakes from expired epoch
            await settleBets();

            // Create new epoch
            await createNewEpoch(current.epochNumber + 1);

            console.log(`[Epoch] Rolled to epoch ${current.epochNumber + 1}`);
        }
    } catch (error) {
        console.error("[Epoch] Rollover check failed:", error);
    }
}

async function createNewEpoch(epochNumber: number) {
    const now = new Date();
    await db.insert(epochs).values({
        epochNumber,
        isActive: true,
        startTime: now,
        endTime: new Date(now.getTime() + EPOCH_DURATION),
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
