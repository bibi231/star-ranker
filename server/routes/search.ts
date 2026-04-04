/**
 * Global Search Routes
 * GET /api/search?q=query
 * GET /api/search/trending
 */

import { Router } from 'express';
import { db } from '../db/index.js';
import { items, users } from '../db/schema.js';
import { ilike, desc } from 'drizzle-orm';

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

// GET /api/search?q=bitcoin
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';

    if (!q.trim()) {
      return res.json({ items: [], users: [], categories: [] });
    }

    // Search items by name
    const searchItems = await db
      .select({
        id: items.id,
        name: items.name,
        rank: items.rank,
        categorySlug: items.categorySlug,
        momentum: items.momentum,
      })
      .from(items)
      .where(ilike(items.name, `%${q}%`))
      .orderBy(desc(items.momentum));

    // Get only top 5
    const topItems = searchItems.slice(0, 5);

    // Search users (Oracles) by handle
    const searchUsers = await db
      .select({
        id: users.id,
        oracleHandle: users.oracleHandle,
        reputation: users.reputation,
      })
      .from(users)
      .where(ilike(users.oracleHandle, `%${q}%`))
      .orderBy(desc(users.reputation));

    // Get only top 5
    const topUsers = searchUsers.slice(0, 5);

    const result = {
      items: topItems.filter((i) => i.name !== null),
      users: topUsers.filter((u) => u.oracleHandle !== null),
      categories: [],
    };

    res.json(result);
  } catch (error: any) {
    console.error('[search] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/search/trending
router.get('/trending', async (req, res) => {
  try {
    const cached = getCached('search_trending');
    if (cached) return res.json(cached);

    // Top 5 items by momentum across all categories
    const trending = await db
      .select({
        id: items.id,
        name: items.name,
        rank: items.rank,
        categorySlug: items.categorySlug,
        momentum: items.momentum,
      })
      .from(items)
      .orderBy(desc(items.momentum));

    // Get only top 5
    const topTrending = trending.slice(0, 5);

    setCached('search_trending', topTrending, 60);
    res.json(topTrending);
  } catch (error: any) {
    console.error('[search-trending] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
