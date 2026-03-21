/**
 * Full DB seed: categories, items (batched for speed), epochs, market meta.
 * Used by CLI (seedAll.ts), HTTP /api/seed-database, and POST /api/admin/seed.
 */
import { sql } from "drizzle-orm";
import { db } from "../db/index";
import { categories, items, epochs, marketMeta } from "../db/schema";
import { CATEGORIES, SEED_ITEMS } from "../data/seedData";

const ITEM_CHUNK = 80;

export async function runFullSeed(): Promise<{ categories: number; items: number }> {
    let itemCount = 0;

    await db.insert(categories).values(CATEGORIES).onConflictDoUpdate({
        target: categories.slug,
        set: {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
        },
    });

    for (const [slug, itemList] of Object.entries(SEED_ITEMS)) {
        for (let start = 0; start < itemList.length; start += ITEM_CHUNK) {
            const slice = itemList.slice(start, start + ITEM_CHUNK);
            const rows = slice.map((item, j) => {
                const i = start + j;
                const baseScore = Math.floor(Math.random() * 8000) + 2000;
                return {
                    docId: `item_${slug}_${i}`,
                    name: item.name,
                    symbol: item.symbol,
                    categorySlug: slug,
                    score: baseScore,
                    velocity: parseFloat(((Math.random() * 20) - 10).toFixed(1)),
                    momentum: parseFloat(((Math.random() * 10) - 5).toFixed(2)),
                    volatility: parseFloat((Math.random() * 10 + 1).toFixed(1)),
                    rank: i + 1,
                    totalVotes: Math.floor(Math.random() * 5000) + 500,
                    trend: Array.from({ length: 15 }, () => Math.floor(Math.random() * 100)),
                    status: "active" as const,
                };
            });

            await db.insert(items).values(rows).onConflictDoUpdate({
                target: items.docId,
                set: {
                    name: sql`excluded.name`,
                    symbol: sql`excluded.symbol`,
                    categorySlug: sql`excluded.category_slug`,
                    score: sql`excluded.score`,
                    velocity: sql`excluded.velocity`,
                    momentum: sql`excluded.momentum`,
                    volatility: sql`excluded.volatility`,
                    rank: sql`excluded.rank`,
                    totalVotes: sql`excluded.total_votes`,
                    trend: sql`excluded.trend`,
                    status: sql`excluded.status`,
                },
            });
            itemCount += rows.length;
        }
    }

    const now = new Date();
    const epochDuration = 30 * 60 * 1000;
    await db.insert(epochs).values({
        epochNumber: 1,
        isActive: true,
        startTime: now,
        endTime: new Date(now.getTime() + epochDuration),
        duration: epochDuration,
    }).onConflictDoNothing();

    await db.insert(marketMeta).values(
        CATEGORIES.map((cat) => ({
            categorySlug: cat.slug,
            totalStaked: 0,
            platformRevenue: 0,
            itemExposure: {} as Record<string, number>,
        }))
    ).onConflictDoUpdate({
        target: marketMeta.categorySlug,
        set: { totalStaked: 0 },
    });

    return { categories: CATEGORIES.length, items: itemCount };
}
