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
// categoryId is the category slug (e.g. "crypto")
router.get("/movers", async (req, res) => {
    try {
        const categorySlug = (req.query.categoryId || req.query.category) as string;
        const type = req.query.type as string; // gainers, losers, sleepers

        if (!categorySlug || !type) {
            return res.status(400).json({ error: "categoryId and type are required" });
        }

        const { epochSnapshots } = await import("../db/schema");
        const { and } = await import("drizzle-orm");

        // Fetch all items in category with latest snapshot (if any)
        const latestEpoch = await db.select({ epochId: epochSnapshots.epochId })
            .from(epochSnapshots)
            .where(eq(epochSnapshots.categorySlug, categorySlug))
            .orderBy(desc(epochSnapshots.epochId))
            .limit(1);

        const currentEpochId = latestEpoch[0]?.epochId;

        const allRows = currentEpochId
            ? await db.select({
                docId: items.docId,
                name: items.name,
                symbol: items.symbol,
                categorySlug: items.categorySlug,
                score: items.score,
                velocity: items.velocity,
                momentum: items.momentum,
                rank: items.rank,
                totalVotes: items.totalVotes,
                imageUrl: items.imageUrl,
                trend: items.trend,
                rankChange: epochSnapshots.rankChange,
              })
                .from(items)
                .leftJoin(epochSnapshots, and(
                    eq(items.docId, epochSnapshots.itemId),
                    eq(epochSnapshots.epochId, currentEpochId)
                ))
                .where(eq(items.categorySlug, categorySlug))
            : await db.select().from(items).where(eq(items.categorySlug, categorySlug))
                .then(rows => rows.map(r => ({ ...r, rankChange: null })));

        const hasRankChange = allRows.some((r: any) => r.rankChange != null);

        let filtered: any[];
        if (hasRankChange && type !== 'sleepers') {
            if (type === 'gainers') {
                filtered = allRows.filter((r: any) => r.rankChange != null && r.rankChange < 0)
                    .sort((a: any, b: any) => (a.rankChange ?? 0) - (b.rankChange ?? 0)).slice(0, 10);
            } else if (type === 'losers') {
                filtered = allRows.filter((r: any) => r.rankChange != null && r.rankChange > 0)
                    .sort((a: any, b: any) => (b.rankChange ?? 0) - (a.rankChange ?? 0)).slice(0, 10);
            } else {
                return res.status(400).json({ error: "Invalid type" });
            }
        } else if (hasRankChange && type === 'sleepers') {
            filtered = allRows.filter((r: any) => r.rankChange != null && Math.abs(r.rankChange) <= 1)
                .sort((a: any, b: any) => (a.momentum ?? 0) - (b.momentum ?? 0)).slice(0, 10);
        } else {
            // Fallback: use velocity when rankChange is null (first epoch or legacy data)
            if (type === 'gainers') {
                filtered = [...allRows].sort((a: any, b: any) => (b.velocity ?? 0) - (a.velocity ?? 0)).slice(0, 10)
                    .map((r: any) => ({ ...r, rankChange: 0 }));
            } else if (type === 'losers') {
                filtered = [...allRows].sort((a: any, b: any) => (a.velocity ?? 0) - (b.velocity ?? 0)).slice(0, 10)
                    .map((r: any) => ({ ...r, rankChange: 0 }));
            } else if (type === 'sleepers') {
                filtered = [...allRows].sort((a: any, b: any) => Math.abs(a.velocity ?? 0) - Math.abs(b.velocity ?? 0)).slice(0, 10)
                    .map((r: any) => ({ ...r, rankChange: 0 }));
            } else {
                return res.status(400).json({ error: "Invalid type" });
            }
        }

        return res.json(filtered);
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
