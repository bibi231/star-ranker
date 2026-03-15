import { Router } from "express";
import { db } from "../db/index";
import { items } from "../db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/items?category=crypto — Fetch items by category slug
router.get("/", async (req, res) => {
    try {
        const category = req.query.category as string;
        if (!category) {
            return res.status(400).json({ error: "category query param required" });
        }

        const result = await db
            .select()
            .from(items)
            .where(eq(items.categorySlug, category))
            .orderBy(desc(items.score));

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/items/movers?categoryId=X&type=gainers|losers|sleepers
router.get("/movers", async (req, res) => {
    try {
        const categoryId = (req.query.categoryId || req.query.category) as string;
        const type = req.query.type as string; // gainers, losers, sleepers

        if (!categoryId || !type) {
            return res.status(400).json({ error: "categoryId and type are required" });
        }

        // Import needed from db/schema
        const { epochSnapshots } = await import("../db/schema");
        const { and, sql } = await import("drizzle-orm");

        // 1. Find the latest epoch snapshot for this category
        const latestEpoch = await db.select({ epochId: epochSnapshots.epochId })
            .from(epochSnapshots)
            .where(eq(epochSnapshots.categorySlug, categoryId))
            .orderBy(desc(epochSnapshots.epochId))
            .limit(1);

        if (latestEpoch.length > 0) {
            const currentEpochId = latestEpoch[0].epochId;

            // Define base query joining items and epochSnapshots
            const query = db.select({
                docId: items.docId,
                name: items.name,
                symbol: items.symbol,
                categorySlug: items.categorySlug,
                score: items.score,
                velocity: items.velocity,
                momentum: items.momentum,
                rank: items.rank,
                rankChange: epochSnapshots.rankChange,
                openingRank: epochSnapshots.openingRank,
                closingRank: epochSnapshots.closingRank
            })
                .from(items)
                .leftJoin(epochSnapshots, and(
                    eq(items.docId, epochSnapshots.itemId),
                    eq(epochSnapshots.epochId, currentEpochId)
                ))
                .where(eq(items.categorySlug, categoryId));

            let result;
            if (type === 'gainers') {
                // Gainers: rankChange < 0 (rank num dropped = moved up)
                result = await query
                    .where(and(eq(items.categorySlug, categoryId), sql`${epochSnapshots.rankChange} < 0`))
                    .orderBy(sql`${epochSnapshots.rankChange} ASC`)
                    .limit(10);
            } else if (type === 'losers') {
                // Losers: rankChange > 0 (rank num rose = moved down)
                result = await query
                    .where(and(eq(items.categorySlug, categoryId), sql`${epochSnapshots.rankChange} > 0`))
                    .orderBy(sql`${epochSnapshots.rankChange} DESC`)
                    .limit(10);
            } else if (type === 'sleepers') {
                // Sleepers: ABS(rankChange) <= 1
                result = await query
                    .where(and(eq(items.categorySlug, categoryId), sql`ABS(${epochSnapshots.rankChange}) <= 1`))
                    .orderBy(sql`${items.momentum} ASC`)
                    .limit(10);
            } else {
                return res.status(400).json({ error: "Invalid type" });
            }

            return res.json(result);
        }

        // Fallback if no snapshots exist yet
        let fallbackQuery = db.select().from(items).where(eq(items.categorySlug, categoryId));
        if (type === 'gainers' || type === 'losers') {
            const fbResult = await fallbackQuery.orderBy(desc(items.momentum)).limit(10);
            return res.json(fbResult.map(i => ({ ...i, rankChange: 0 })));
        } else if (type === 'sleepers') {
            const fbResult = await fallbackQuery.orderBy(sql`${items.momentum} ASC`).limit(10);
            return res.json(fbResult.map(i => ({ ...i, rankChange: 0 })));
        }

        return res.status(400).json({ error: "Invalid type" });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/items/:docId — Get single item
router.get("/:docId", async (req, res) => {
    try {
        const result = await db
            .select()
            .from(items)
            .where(eq(items.docId, req.params.docId))
            .limit(1);

        if (result.length === 0) {
            return res.status(404).json({ error: "Item not found" });
        }

        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
