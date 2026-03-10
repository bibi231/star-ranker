/**
 * Momentum-Weighted Ranking Engine (MWR)
 * Ported from Cloud Functions to Express + Neon Postgres.
 * 
 * Runs on a 60-second interval. Applies entropy decay to all items,
 * recalculates ranks, and persists to Postgres.
 */

import { db } from "../db/index";
import { items, votes } from "../db/schema";
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

        for (let i = 0; i < updated.length; i++) {
            const item = updated[i];
            const newRank = i + 1;

            // Only update if values actually changed
            if (item.rank !== newRank || Math.abs((item.momentum ?? 0) - (updated[i].momentum ?? 0)) > 0.001) {
                await db.update(items).set({
                    rank: newRank,
                    momentum: updated[i].momentum,
                    velocity: updated[i].velocity,
                }).where(eq(items.id, item.id));
            }
        }
    }

    console.log(`[MWR] Reified ${allItems.length} items across ${Object.keys(byCategory).length} categories`);
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
