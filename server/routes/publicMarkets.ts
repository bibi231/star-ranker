/**
 * Public Markets Preview — No authentication required
 * Shows categories with top items, active stakers, and volume
 */

import { Router } from 'express';
import { db } from '../db/index.js';
import { categories, items, stakes, epochs } from '../db/schema.js';
import { eq, and, desc, sql, lte, gte } from 'drizzle-orm';

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

// GET /api/markets/public-preview
router.get('/', async (req, res) => {
  try {
    const cached = getCached('markets_public_preview');
    if (cached) return res.json(cached);

    // Get current epoch
    const now = new Date();
    const [currentEpoch] = await db
      .select()
      .from(epochs)
      .where(
        and(
          lte(epochs.startTime, now),
          gte(epochs.endTime, now),
          eq(epochs.isActive, true)
        )
      )
      .limit(1);

    const epochId = currentEpoch?.id;

    // Get all active categories
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isFrozen, false));

    const result = await Promise.all(
      allCategories.map(async (cat) => {
        // Get top item in category
        const topItems = await db
          .select()
          .from(items)
          .where(eq(items.categorySlug, cat.slug))
          .orderBy(desc(items.rank))
          .limit(1);

        const topItem = topItems[0];

        // Count active stakers in this category in current epoch
        const stakers = await db
          .select({
            count: sql<number>`COUNT(DISTINCT ${stakes.userId})`.mapWith(Number),
          })
          .from(stakes)
          .where(
            and(
              eq(stakes.categorySlug, cat.slug),
              epochId ? eq(stakes.epochId, epochId) : undefined,
              eq(stakes.status, 'active')
            )
          );

        // Calculate epoch volume
        const volume = await db
          .select({
            total: sql<number>`COALESCE(SUM(${stakes.amount}), 0)`.mapWith(Number),
          })
          .from(stakes)
          .where(
            and(
              eq(stakes.categorySlug, cat.slug),
              epochId ? eq(stakes.epochId, epochId) : undefined,
              eq(stakes.status, 'active')
            )
          );

        return {
          id: cat.id,
          slug: cat.slug,
          name: cat.title,
          icon: cat.description?.split('|')[0] || '??', // First icon from description
          topItem: topItem ? { name: topItem.name, rank: topItem.rank } : null,
          activeStakers: stakers[0]?.count || 0,
          epochVolume: volume[0]?.total || 0,
        };
      })
    );

    setCached('markets_public_preview', result, 30); // Cache for 30 seconds
    res.json(result);
  } catch (error: any) {
    console.error('[public-markets-preview] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
