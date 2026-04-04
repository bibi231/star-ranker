/**
 * Public Stats Routes — No authentication required
 * Aggressive caching recommended
 */

import { Router } from 'express';
import { db } from '../db/index.js';
import { stakes, epochs, users } from '../db/schema.js';
import { eq, gt, gte, lte, and, desc, sql } from 'drizzle-orm';

const router = Router();

// Cache layer
const cache: Record<string, { data: any; expiry: number }> = {};

function getCached(key: string): any {
  const entry = cache[key];
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }
  delete cache[key];
  return null;
}

function setCached(key: string, data: any, ttlSeconds: number) {
  cache[key] = { data, expiry: Date.now() + ttlSeconds * 1000 };
}

// GET /api/stats/public
// Returns: { totalStakedToday, activeOracles, epochsSettledToday, totalWonToday }
router.get('/', async (req, res) => {
  try {
    const cached = getCached('stats_public');
    if (cached) return res.json(cached);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total staked today
    const stakedToday = await db
      .select({
        total: sql<number>`COALESCE(SUM(${stakes.amount}), 0)`.mapWith(Number),
      })
      .from(stakes)
      .where(
        and(
          gte(stakes.createdAt, todayStart),
          lte(stakes.createdAt, now)
        )
      );

    // Active Oracles (users with stakes in last 24 hours)
    const activeOracles = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${stakes.userId})`.mapWith(Number),
      })
      .from(stakes)
      .where(
        and(
          gte(stakes.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
          lte(stakes.createdAt, now)
        )
      );

    // Epochs settled today
    const settledEpochs = await db
      .select({
        count: sql<number>`COUNT(*)`.mapWith(Number),
      })
      .from(epochs)
      .where(
        and(
          gte(epochs.endTime, todayStart),
          lte(epochs.endTime, now),
          eq(epochs.isActive, false)
        )
      );

    // Total won today (settled stakes with positive outcome)
    const wonToday = await db
      .select({
        total: sql<number>`COALESCE(SUM(${stakes.payout}), 0)`.mapWith(Number),
      })
      .from(stakes)
      .where(
        and(
          gte(stakes.createdAt, todayStart),
          lte(stakes.createdAt, now),
          eq(stakes.outcome, 'won'),
          eq(stakes.isSettled, true)
        )
      );

    const result = {
      totalStakedToday: stakedToday[0]?.total || 0,
      activeOracles: activeOracles[0]?.count || 0,
      epochsSettledToday: settledEpochs[0]?.count || 0,
      totalWonToday: wonToday[0]?.total || 0,
    };

    setCached('stats_public', result, 60); // Cache for 60 seconds
    res.json(result);
  } catch (error: any) {
    console.error('[public-stats] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
