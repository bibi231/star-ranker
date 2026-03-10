import * as admin from "firebase-admin";
import { reifyRankings } from "../rankingEngine";

const db = admin.firestore();

export interface EpochMetadata {
    epochId: number;
    startTime: admin.firestore.Timestamp;
    endTime: admin.firestore.Timestamp;
    durationMinutes: number;
    isActive: boolean;
    createdAt: admin.firestore.Timestamp;
}

/**
 * Ensures a global epoch exists or advances it if the current one has expired.
 * Runs on a 1-minute cron.
 * @param force If true, advance even if the end time hasn't been reached.
 */
export async function manageEpochs(force: boolean = false) {
    // Check global pause
    const platformSettings = await db.collection("settings").doc("platform").get();
    if (platformSettings.exists && platformSettings.data()?.isEpochPaused && !force) {
        console.log("Epoch progression is currently paused.");
        return;
    }

    const epochRef = db.collection("epochs");
    const activeQuery = await epochRef.where("isActive", "==", true).limit(1).get();

    let currentEpochDoc = activeQuery.empty ? null : activeQuery.docs[0];
    const now = admin.firestore.Timestamp.now();

    // 1. If no active epoch, initialization is required
    if (!currentEpochDoc) {
        console.log("No active epoch found. Initializing Epoch #1...");
        const startTime = now;
        const durationMinutes = 30;
        const endTime = admin.firestore.Timestamp.fromMillis(startTime.toMillis() + (durationMinutes * 60 * 1000));

        await epochRef.add({
            epochId: 1,
            startTime,
            endTime,
            durationMinutes,
            isActive: true,
            createdAt: now
        });
        return;
    }

    const currentEpoch = currentEpochDoc.data() as EpochMetadata;

    // 2. Check if current epoch should close
    const shouldClose = force || (now.toMillis() >= currentEpoch.endTime.toMillis());

    if (shouldClose) {
        console.log(`Closing Epoch #${currentEpoch.epochId} and advancing... (Forced: ${force})`);

        await db.runTransaction(async (transaction) => {
            // Close current
            transaction.update(currentEpochDoc!.ref, { isActive: false });

            // Snapshot all markets
            const categories = await db.collection("categories").get();
            for (const catDoc of categories.docs) {
                const itemsQuery = await db.collection("items").where("categoryId", "==", catDoc.id).get();
                const items = itemsQuery.docs.map(d => ({ id: d.id, ...d.data() } as any));

                // Process rankings & apply decay
                const finalRankings = reifyRankings(items);

                // Create Snapshot doc (immutable)
                const snapshotRef = db.collection("epoch_snapshots").doc();
                transaction.set(snapshotRef, {
                    epochId: currentEpoch.epochId,
                    categoryId: catDoc.id,
                    categorySlug: catDoc.data().slug,
                    rankings: finalRankings.map((it, idx) => ({
                        itemId: it.id,
                        name: it.name,
                        score: it.score,
                        momentum: it.momentum,
                        velocity: it.velocity,
                        rank: idx + 1
                    })),
                    createdAt: now
                });

                // Update items in Firestore with the newly decayed state
                for (const updatedItem of finalRankings) {
                    const itemRef = db.collection("items").doc(updatedItem.id);
                    transaction.update(itemRef, {
                        momentum: updatedItem.momentum,
                        velocity: updatedItem.velocity,
                        lastUpdated: now.toMillis()
                    });
                }
            }

            // Start Next Epoch
            const nextEpochId = currentEpoch.epochId + 1;
            const nextStartTime = now.toMillis() > currentEpoch.endTime.toMillis() ? now : currentEpoch.endTime;
            const nextEndTime = admin.firestore.Timestamp.fromMillis(nextStartTime.toMillis() + (currentEpoch.durationMinutes * 60 * 1000));

            const nextEpochRef = db.collection("epochs").doc();
            transaction.set(nextEpochRef, {
                epochId: nextEpochId,
                startTime: nextStartTime,
                endTime: nextEndTime,
                durationMinutes: currentEpoch.durationMinutes,
                isActive: true,
                createdAt: now
            });
        });

        console.log(`Successfully advanced to Epoch #${currentEpoch.epochId + 1}`);
    }
}
