/**
 * Public Leaderboard — No authentication required
 * Shows top 100 Oracles by reputation
 */

import { Router } from 'express';
import { db } from '../db/index';
import { users, stakes } from '../db/schema';
import { eq, isNotNull, desc, and, sql } from 'drizzle-orm';

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

// GET /api/leaderboard/public
router.get('/', async (req, res) => {
  try {
    const cached = getCached('leaderboard_public');
    if (cached) return res.json(cached);

    // Get top 100 users by reputation, must have oracle handle
    const topUsers = await db
      .select({
        id: users.id,
        oracleHandle: users.oracleHandle,
        reputation: users.reputation,
        tier: users.tier,
        firebaseUid: users.firebaseUid,
      })
      .from(users)
      .where(isNotNull(users.oracleHandle))
      .orderBy(desc(users.reputation));

    // Get only top 100 in memory
    const top100 = topUsers.slice(0, 100);

    // Calculate win rate and total staked for each user
    const result = await Promise.all(
      top100.map(async (user, idx) => {
        // Get win stats
        const allStakes = await db
          .select()
          .from(stakes)
          .where(eq(stakes.userId, user.firebaseUid));

        const wins = allStakes.filter((s) => s.outcome === 'won').length;
        const total = allStakes.length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        const totalStaked = allStakes.reduce((sum, s) => sum + (s.amount || 0), 0);

        return {
          rank: idx + 1,
          oracleHandle: user.oracleHandle,
          reputation: user.reputation,
          tier: user.tier,
          winRate,
          totalStaked,
        };
      })
    );

    setCached('leaderboard_public', result, 300); // Cache for 5 minutes
    res.json(result);
  } catch (error: any) {
    console.error('[leaderboard-public] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
