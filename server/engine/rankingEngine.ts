/**
 * Momentum-Weighted Ranking Engine (MWR)
 * Ported from Cloud Functions to Express + Neon Postgres.
 * 
 * Runs on a 60-second interval. Applies entropy decay to all items,
 * recalculates ranks, and persists to Postgres.
 */

import { db } from "../db/index";
import { items, votes, epochSnapshots } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

const GRAVITY = 0.05;   // Decay constant
const VISCOSITY = 1.0;  // Resistance to movement
const REIFY_INTERVAL = 60_000; // 60 seconds

/**
 * Apply entropy decay to all items and recalculate ranks.
 * Called periodically by the scheduler.
 */
export async function reifyRankings() {
    const now = Date.now();
    console.log(`[MWR] Reifying rankings at ${new Date(now).toISOString()}`);

    // Fetch all active items grouped by category
    const allItems = await db.select().from(items).where(eq(items.status, "active"));

    // Group by category
    const byCategory: Record<string, typeof allItems> = {};
    for (const item of allItems) {
        if (!byCategory[item.categorySlug]) byCategory[item.categorySlug] = [];
        byCategory[item.categorySlug].push(item);
    }

    // Process each category
    for (const [slug, categoryItems] of Object.entries(byCategory)) {
        // Apply momentum decay
        const updated = categoryItems.map(item => {
            const lastUpdated = item.createdAt?.getTime() || now - 60000;
            const deltaT = (now - lastUpdated) / 1000;
            const currentMomentum = item.momentum ?? 0;
            const decayedMomentum = currentMomentum * Math.exp(-GRAVITY * deltaT);
            const newVelocity = (decayedMomentum - currentMomentum) / (deltaT || 1);

            return {
                ...item,
                momentum: parseFloat(decayedMomentum.toFixed(4)),
                velocity: parseFloat(newVelocity.toFixed(4)),
            };
        });

        // Sort by score descending and assign ranks
        updated.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        // Prepare updates for batching
        const updates = updated.map((item, i) => ({
            id: item.id,
            rank: i + 1,
            momentum: item.momentum,
            velocity: item.velocity,
            score: item.score, // Ensure score is synced
        }));

        // Perform batch update for all items in the category
        if (updates.length > 0) {
            await db.transaction(async (tx) => {
                for (const update of updates) {
                    await tx.update(items)
                        .set({
                            rank: update.rank,
                            momentum: update.momentum,
                            velocity: update.velocity,
                            score: update.score,
                        })
                        .where(eq(items.id, update.id));
                }
            });
        }
    }

    console.log(`[MWR] Reified ${allItems.length} items across ${Object.keys(byCategory).length} categories`);
}

/**
 * Capture an immutable snapshot of current rankings for an epoch.
 */
export async function createEpochSnapshot(epochId: number) {
    console.log(`[Snapshot] Capturing state for epoch #${epochId}...`);

    const allItems = await db.select().from(items).where(eq(items.status, "active"));

    if (allItems.length === 0) return;

    const snapshots = allItems.map(item => ({
        epochId,
        itemId: item.docId,
        categorySlug: item.categorySlug,
        rank: item.rank || 0,
        score: item.score || 0,
        velocity: item.velocity || 0,
    }));

    await db.insert(epochSnapshots).values(snapshots);
    console.log(`[Snapshot] Saved ${snapshots.length} item records for epoch #${epochId}`);
}

/**
 * Start the ranking engine scheduler.
 */
export function startRankingEngine() {
    console.log(`⚡ Ranking engine started (every ${REIFY_INTERVAL / 1000}s)`);

    // Run immediately on startup
    setTimeout(() => reifyRankings().catch(console.error), 5000);

    // Then run every 60 seconds
    setInterval(() => {
        reifyRankings().catch(console.error);
    }, REIFY_INTERVAL);
}
