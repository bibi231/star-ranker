/**
 * Momentum-Weighted Ranking Engine (MWR)
 * Ported from Cloud Functions to Express + Neon Postgres.
 * 
 * Runs on a 60-second interval. Applies entropy decay to all items,
 * recalculates ranks, and persists to Postgres.
 */

import { db } from "../db/index";
import { items, votes, epochSnapshots } from "../db/schema";
import { eq, desc, sql, or, isNull } from "drizzle-orm";

const GRAVITY = 0.05;   // Decay constant
const VISCOSITY = 1.0;  // Resistance to movement
const REIFY_INTERVAL = 60_000; // 60 seconds
const SNAPSHOT_CHUNK = 20;

/**
 * Apply entropy decay to all items and recalculate ranks.
 * Called periodically by the scheduler.
 */
export async function reifyRankings() {
    const now = Date.now();
    console.log(`[MWR] Reifying rankings at ${new Date(now).toISOString()}`);

    // Treat NULL status as active for backward compatibility with older seeded rows.
    const allItems = await db
        .select()
        .from(items)
        .where(or(eq(items.status, "active"), isNull(items.status)));

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

        // Sort by score descending, then momentum descending, then id for consistency
        updated.sort((a, b) => {
            if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
            if ((b.momentum ?? 0) !== (a.momentum ?? 0)) return (b.momentum ?? 0) - (a.momentum ?? 0);
            return a.id - b.id;
        });

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

    // Some legacy rows have NULL status; include them so snapshots are never empty.
    const allItems = await db
        .select()
        .from(items)
        .where(or(eq(items.status, "active"), isNull(items.status)));

    if (allItems.length === 0) {
        console.warn("[Snapshot] No items found to snapshot.");
        return;
    }

    const snapshots = allItems.map(item => ({
        epochId,
        itemId: item.docId,
        categorySlug: item.categorySlug,
        rank: item.rank || 0,
        score: item.score || 0,
        velocity: item.velocity || 0,
    }));

    for (let start = 0; start < snapshots.length; start += SNAPSHOT_CHUNK) {
        const chunk = snapshots.slice(start, start + SNAPSHOT_CHUNK);
        await db.insert(epochSnapshots).values(chunk);
    }
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
