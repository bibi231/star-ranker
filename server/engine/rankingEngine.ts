/**
 * Momentum-Weighted Ranking Engine (MWR) — Production Hardened
 * 
 * Signal Score = (upVotes - downVotes) + (totalStaked * velocityFactor)
 * AVD: Automated Velocity Detection — caps rank changes at MAX_RANK_DELTA per cycle
 * 
 * Runs on a 60-second interval (or via /api/sync cron).
 * Applies entropy decay, recalculates ranks, and persists to Postgres + Firestore.
 */

import { db } from "../db/index.js";
import { items, votes, epochSnapshots, priceAlerts, notifications, stakes, marketMeta } from "../db/schema.js";
import { eq, or, isNull, and, sql } from "drizzle-orm";
import { calculateOdds, calculateMultipleOdds } from "./oddsCalculator.js";

let firestoreDb: any = null;
try {
    const { getFirestore } = require('firebase-admin/firestore');
    firestoreDb = getFirestore();
} catch (err) {
    console.warn('[MWR] Firebase Firestore not available');
}

const GRAVITY = 0.05;           // Decay constant
const REIFY_INTERVAL = 60_000;  // 60 seconds
const SNAPSHOT_CHUNK = 20;
const VELOCITY_FACTOR = 0.001;  // Prevents whales from dominating pure vote counts
const MAX_RANK_DELTA = 5;       // AVD: max positions an item can jump per cycle
const MAX_SCORE_DELTA = 50;     // AVD: max signal score change per cycle

/**
 * Calculate Signal Score using the manifest formula:
 *   Signal Score = (upVotes - downVotes) + (totalStaked * velocityFactor)
 * 
 * With AVD (Automated Velocity Detection) capping:
 *   If score would change by more than MAX_SCORE_DELTA, cap it and log suppression.
 */
function calculateSignalScore(
    item: { score: number | null; totalVotes: number | null; docId: string; categorySlug: string },
    totalStakedOnItem: number,
    previousScore: number
): number {
    const voteBalance = item.score ?? 0;  // score already tracks net votes
    const stakingInfluence = totalStakedOnItem * VELOCITY_FACTOR;
    const rawScore = voteBalance + stakingInfluence;

    // AVD: cap velocity to prevent manipulation
    const delta = rawScore - previousScore;
    if (Math.abs(delta) > MAX_SCORE_DELTA) {
        const cappedScore = previousScore + Math.sign(delta) * MAX_SCORE_DELTA;
        console.warn(`[AVD] Suppressed ${item.docId}: delta ${delta.toFixed(1)} capped to ±${MAX_SCORE_DELTA}`);
        return cappedScore;
    }

    return rawScore;
}

/**
 * Apply entropy decay to all items and recalculate ranks.
 * Called periodically by the scheduler or /api/sync cron.
 */
export async function reifyRankings() {
    const now = Date.now();
    console.log(`[MWR] Reifying rankings at ${new Date(now).toISOString()}`);

    // Treat NULL status as active for backward compatibility with older seeded rows.
    const allItems = await db
        .select()
        .from(items)
        .where(or(eq(items.status, "active"), isNull(items.status)));

    if (allItems.length === 0) {
        console.log("[MWR] No items to reify.");
        return;
    }

    // Fetch total staked per item from market_meta for staking influence
    const allMeta = await db.select().from(marketMeta);
    const itemExposureMap: Record<string, number> = {};
    for (const meta of allMeta) {
        const exposure = (meta.itemExposure as Record<string, number>) || {};
        for (const [docId, amount] of Object.entries(exposure)) {
            itemExposureMap[docId] = (itemExposureMap[docId] || 0) + (amount || 0);
        }
    }

    // Group by category
    const byCategory: Record<string, typeof allItems> = {};
    for (const item of allItems) {
        if (!byCategory[item.categorySlug]) byCategory[item.categorySlug] = [];
        byCategory[item.categorySlug].push(item);
    }

    // Process each category
    for (const [slug, categoryItems] of Object.entries(byCategory)) {
        // Apply momentum decay + signal score calculation
        const updated = categoryItems.map(item => {
            const lastUpdated = item.createdAt?.getTime() || now - 60000;
            const deltaT = Math.min((now - lastUpdated) / 1000, 3600); // Cap at 1 hour for safety
            const currentMomentum = item.momentum ?? 0;
            const decayedMomentum = currentMomentum * Math.exp(-GRAVITY * deltaT);
            const newVelocity = deltaT > 0 ? (decayedMomentum - currentMomentum) / deltaT : 0;

            // Calculate Signal Score with AVD
            const stakedOnItem = itemExposureMap[item.docId] || 0;
            const previousScore = item.score ?? 0;
            const signalScore = calculateSignalScore(item, stakedOnItem, previousScore);

            return {
                ...item,
                score: Math.round(signalScore),
                momentum: parseFloat(decayedMomentum.toFixed(4)),
                velocity: parseFloat(newVelocity.toFixed(4)),
            };
        });

        // Sort by signal score descending, then momentum, then id for consistency
        updated.sort((a, b) => {
            if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
            if ((b.momentum ?? 0) !== (a.momentum ?? 0)) return (b.momentum ?? 0) - (a.momentum ?? 0);
            return a.id - b.id;
        });

        // Prepare updates with AVD rank capping
        const updates = updated.map((item, i) => {
            const desiredRank = i + 1;
            const previousRank = item.rank ?? desiredRank;
            const rankDelta = desiredRank - previousRank;

            // AVD: cap rank change per cycle
            let newRank = desiredRank;
            if (Math.abs(rankDelta) > MAX_RANK_DELTA) {
                newRank = previousRank + Math.sign(rankDelta) * MAX_RANK_DELTA;
                console.warn(`[AVD] Rank capped for ${item.docId}: wanted ${desiredRank}, capped to ${newRank} (from ${previousRank})`);
            }

            return {
                id: item.id,
                rank: Math.max(1, newRank), // Never go below rank 1
                momentum: item.momentum,
                velocity: item.velocity,
                score: item.score,
            };
        });

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
 * Recalculate ranks specifically for a single category.
 * Used for targeted updates when a vote occurs (crucial for serverless environments).
 */
export async function reifyCategoryRankings(slug: string) {
    const now = Date.now();
    const catItems = await db
        .select()
        .from(items)
        .where(and(
            eq(items.categorySlug, slug),
            or(eq(items.status, "active"), isNull(items.status))
        ));

    if (catItems.length === 0) return;

    // Apply basic momentum decay logic to this category
    const updated = catItems.map(item => {
        const lastCreated = item.createdAt?.getTime() || now - 60000;
        const deltaT = (now - lastCreated) / 1000;
        const currentMomentum = item.momentum ?? 0;
        const decayedMomentum = currentMomentum * Math.exp(-GRAVITY * Math.min(deltaT, 3600));
        
        return {
            ...item,
            momentum: parseFloat(decayedMomentum.toFixed(4)),
        };
    });

    // Sort by score descending
    updated.sort((a, b) => {
        if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
        if ((b.momentum ?? 0) !== (a.momentum ?? 0)) return (b.momentum ?? 0) - (a.momentum ?? 0);
        return a.id - b.id;
    });

    // Perform batch update with AVD rank capping
    await db.transaction(async (tx) => {
        for (let i = 0; i < updated.length; i++) {
            const item = updated[i];
            const desiredRank = i + 1;
            const previousRank = item.rank ?? desiredRank;
            const rankDelta = desiredRank - previousRank;

            let newRank = desiredRank;
            if (Math.abs(rankDelta) > MAX_RANK_DELTA) {
                newRank = previousRank + Math.sign(rankDelta) * MAX_RANK_DELTA;
            }
            newRank = Math.max(1, newRank);

            if (item.rank !== newRank || item.momentum !== updated[i].momentum) {
                await tx.update(items)
                    .set({ rank: newRank, momentum: item.momentum })
                    .where(eq(items.id, item.id));
            }
        }
    });
}

/**
 * Snapshot all items' current ranks as "opening ranks" for a new epoch.
 * This is what Directional stakes compare against at settlement.
 */
export async function snapshotOpeningRanks(epochId: number) {
    console.log(`[Snapshot] Capturing opening ranks for epoch #${epochId}...`);

    const allItems = await db
        .select()
        .from(items)
        .where(or(eq(items.status, "active"), isNull(items.status)));

    if (allItems.length === 0) {
        console.warn("[Snapshot] No items found to snapshot opening ranks.");
        return;
    }

    const snapshots = allItems.map(item => ({
        epochId,
        itemId: item.docId,
        categorySlug: item.categorySlug,
        rank: item.rank || 0,
        score: item.score || 0,
        velocity: item.velocity || 0,
        openingRank: item.rank || 0,
        closingRank: null as number | null,  // Will be filled at epoch close
        rankChange: null as number | null,
    }));

    for (let start = 0; start < snapshots.length; start += SNAPSHOT_CHUNK) {
        const chunk = snapshots.slice(start, start + SNAPSHOT_CHUNK);
        await db.insert(epochSnapshots).values(chunk).onConflictDoNothing();
    }

    console.log(`[Snapshot] Saved ${snapshots.length} opening rank records for epoch #${epochId}`);
}

/**
 * Sync updated rankings to Firestore for real-time listeners
 */
async function syncRankingsToFirestore(allItems: typeof items.$inferSelect[]) {
    if (!firestoreDb) return;

    try {
        const batch = firestoreDb.batch();
        const currentEpochId = 1;

        const categories = [...new Set(allItems.map(i => i.categorySlug))];
        const oddsLookup: Record<string, any> = {};
        
        for (const cat of categories) {
            const catItems = allItems.filter(i => i.categorySlug === cat).map(i => i.docId);
            const oddsObj = await calculateMultipleOdds(catItems, cat, currentEpochId);
            Object.assign(oddsLookup, oddsObj);
        }

        for (const item of allItems) {
            const odds = oddsLookup[item.docId] || { impliedProbability: 50, multiplier: 2.0, riskLevel: 'medium' };
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
 * Capture an immutable snapshot of current rankings for an epoch (at close).
 * Computes rank_change by comparing with the opening snapshot.
 */
export async function createEpochSnapshot(epochId: number) {
    console.log(`[Snapshot] Capturing closing state for epoch #${epochId}...`);

    const allItems = await db
        .select()
        .from(items)
        .where(or(eq(items.status, "active"), isNull(items.status)));

    if (allItems.length === 0) {
        console.warn("[Snapshot] No items found to snapshot.");
        return;
    }

    // Fetch opening snapshot for this epoch to compute rank_change
    const openingSnapshots = await db
        .select({ itemId: epochSnapshots.itemId, openingRank: epochSnapshots.openingRank })
        .from(epochSnapshots)
        .where(eq(epochSnapshots.epochId, epochId));

    const openingByItem = new Map<string, number>();
    for (const s of openingSnapshots) {
        if (s.openingRank != null) {
            openingByItem.set(s.itemId, s.openingRank);
        }
    }

    // If opening snapshots exist, update them with closing data
    if (openingSnapshots.length > 0) {
        for (const item of allItems) {
            const currentRank = item.rank || 0;
            const openingRank = openingByItem.get(item.docId);
            const rankChange = openingRank != null ? openingRank - currentRank : null;

            await db.update(epochSnapshots)
                .set({
                    closingRank: currentRank,
                    rankChange,
                    score: item.score || 0,
                    velocity: item.velocity || 0,
                })
                .where(and(
                    eq(epochSnapshots.epochId, epochId),
                    eq(epochSnapshots.itemId, item.docId)
                ));
        }
        console.log(`[Snapshot] Updated ${allItems.length} closing ranks for epoch #${epochId}`);
    } else {
        // Fallback: no opening snapshot exists, create full snapshot
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
            const rankChange = prevRank != null ? prevRank - currentRank : null;
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
        console.log(`[Snapshot] Saved ${snapshots.length} full snapshot records for epoch #${epochId}`);
    }
}

/**
 * Start the ranking engine scheduler.
 * Only starts intervals on long-running servers (Render), NOT on Vercel serverless.
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
