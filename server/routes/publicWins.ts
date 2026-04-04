/**
 * Recent Wins Public Feed — No authentication required
 * Shows recent winning stakes to create FOMO
 */

import { Router } from 'express';
import { db } from '../db/index.js';
import { stakes, users } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

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

// GET /api/wins/recent-public
// Returns: last 20 winning stakes (anonymised or with handle)
router.get('/', async (req, res) => {
  try {
    const cached = getCached('wins_recent_public');
    if (cached) return res.json(cached);

    // Get recent winning stakes
    const winningStakes = await db
      .select({
        stakeId: stakes.id,
        userId: stakes.userId,
        amount: stakes.payout,
        itemName: stakes.itemName,
        categorySlug: stakes.categorySlug,
        settledAt: stakes.createdAt,
      })
      .from(stakes)
      .where(
        and(
          eq(stakes.outcome, 'won'),
          eq(stakes.isSettled, true)
        )
      )
      .orderBy(desc(stakes.createdAt));

    // Get only last 20 in memory
    const recent = winningStakes.slice(0, 20);

    // Get user handles for those who have them
    const result = await Promise.all(
      recent.map(async (win) => {
        const [user] = await db
          .select({ oracleHandle: users.oracleHandle })
          .from(users)
          .where(eq(users.firebaseUid, win.userId));

        return {
          oracleHandle: user?.oracleHandle || 'Anonymous Oracle',
          amount: win.amount,
          itemName: win.itemName,
          categoryName: win.categorySlug,
          settledAt: win.settledAt,
        };
      })
    );

    setCached('wins_recent_public', result, 60); // Cache for 60 seconds
    res.json(result);
  } catch (error: any) {
    console.error('[wins-recent-public] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
