/**
 * Momentum-Weighted Ranking Engine (MWR)
 * Ported from Cloud Functions to Express + Neon Postgres.
 * 
 * Runs on a 60-second interval. Applies entropy decay to all items,
 * recalculates ranks, and persists to Postgres.
 */

import { db } from "../db/index";
import { items, votes, epochSnapshots, priceAlerts, notifications } from "../db/schema";
import { eq, or, isNull, and } from "drizzle-orm";
import { calculateOdds } from "./oddsCalculator";

let firestoreDb: any = null;
try {
    const { getFirestore } = require('firebase-admin/firestore');
    firestoreDb = getFirestore();
} catch (err) {
    console.warn('[MWR] Firebase Firestore not available');
}

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

            // Update allItems references so downstream functions get fresh data
            for (const item of allItems) {
                const u = updates.find(x => x.id === item.id);
                if (u) {
                    item.rank = u.rank;
                    item.momentum = u.momentum;
                    item.velocity = u.velocity;
                    item.score = u.score;
                }
            }
        }
    }

    console.log(`[MWR] Reified ${allItems.length} items across ${Object.keys(byCategory).length} categories`);

    // Process alerts with the fresh data
    await checkPriceAlerts(allItems);

    // Sync to Firestore for real-time listeners
    await syncRankingsToFirestore(allItems);
}

/**
 * Sync updated rankings to Firestore for real-time listeners
 */
async function syncRankingsToFirestore(allItems: typeof items.$inferSelect[]) {
    if (!firestoreDb) return; // Firestore not available

    try {
        const batch = firestoreDb.batch();
        const currentEpochId = 1; // Get current epoch ID if needed

        for (const item of allItems) {
            const odds = await calculateOdds(item.id, item.categorySlug, currentEpochId);
            const ref = firestoreDb.doc(`rankings/${item.categorySlug}/items/${item.id}`);
            batch.set(ref, {
                rank: item.rank,
                momentum: item.momentum,
                impliedProbability: odds.impliedProbability,
                multiplier: odds.multiplier,
                riskLevel: odds.riskLevel,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        }

        // Update category summary
        const categories = [...new Set(allItems.map(i => i.categorySlug))];
        for (const categorySlug of categories) {
            const categoryItems = allItems.filter(i => i.categorySlug === categorySlug);
            const ref = firestoreDb.doc(`categories/${categorySlug}`);
            batch.set(ref, {
                lastUpdated: new Date().toISOString(),
                topItem: categoryItems[0]?.name || '',
            }, { merge: true });
        }

        await batch.commit();
        console.log(`[MWR] Synced ${allItems.length} items to Firestore`);
    } catch (err: any) {
        console.error('[MWR] Firestore sync failed:', err.message);
        // Never crash rankingEngine because of Firestore failure
    }
}

/**
 * Cross-references updated item ranks with user priceAlerts and issues notifications
 */
async function checkPriceAlerts(updatedItems: typeof items.$inferSelect[]) {
    try {
        const activeAlerts = await db.select().from(priceAlerts).where(eq(priceAlerts.active, true));
        if (activeAlerts.length === 0) return;

        for (const alert of activeAlerts) {
            const item = updatedItems.find(i => i.docId === alert.itemDocId);
            if (!item) continue;

            let isTriggered = false;
            let triggerValue = "";

            if (alert.alertType === "rank_above" && (item.rank ?? 999) <= alert.threshold) {
                isTriggered = true;
                triggerValue = `Rank reached ${item.rank} (crossed ${alert.threshold})`;
            } else if (alert.alertType === "rank_below" && (item.rank ?? 0) >= alert.threshold) {
                isTriggered = true;
                triggerValue = `Rank dropped to ${item.rank} (crossed ${alert.threshold})`;
            } else if (alert.alertType === "momentum_spike" && (item.momentum ?? 0) >= alert.threshold) {
                isTriggered = true;
                triggerValue = `Momentum spiked to ${item.momentum?.toFixed(2)} (crossed ${alert.threshold})`;
            }

            if (isTriggered) {
                await db.transaction(async (tx) => {
                    // Mark as triggered and inactive (one-shot alert)
                    await tx.update(priceAlerts).set({
                        active: false,
                        triggered: true
                    }).where(eq(priceAlerts.id, alert.id));

                    await tx.insert(notifications).values({
                        userId: alert.userId,
                        type: 'general',
                        title: `Alert Triggered: ${item.name}`,
                        message: `Your alert conditions were met. ${triggerValue}`,
                        metadata: { alertId: alert.id, itemDocId: item.docId, rank: item.rank }
                    });
                });
            }
        }
    } catch (err) {
        console.error("[MWR] checkPriceAlerts failed:", err);
    }
}

/**
 * Capture an immutable snapshot of current rankings for an epoch.
 * Computes rank_change by comparing with the previous epoch's snapshot.
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

    // Fetch previous epoch's snapshots to compute rank_change (prev_rank - current_rank; negative = moved up)
    const prevSnapshots = await db
        .select({ itemId: epochSnapshots.itemId, categorySlug: epochSnapshots.categorySlug, rank: epochSnapshots.rank })
        .from(epochSnapshots)
        .where(eq(epochSnapshots.epochId, epochId - 1));

    const prevByKey = new Map<string, number>();
    for (const s of prevSnapshots) {
        prevByKey.set(`${s.categorySlug}:${s.itemId}`, s.rank ?? 0);
    }

    const snapshots = allItems.map(item => {
        const currentRank = item.rank || 0;
        const prevRank = prevByKey.get(`${item.categorySlug}:${item.docId}`);
        const rankChange = prevRank != null ? prevRank - currentRank : null; // negative = gained (moved up)
        return {
            epochId,
            itemId: item.docId,
            categorySlug: item.categorySlug,
            rank: currentRank,
            score: item.score || 0,
            velocity: item.velocity || 0,
            openingRank: prevRank ?? null,
            closingRank: currentRank,
            rankChange,
        };
    });

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
