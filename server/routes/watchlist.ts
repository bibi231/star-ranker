import { Router, Response } from "express";
import { db } from "../db";
import { watchlist, items } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/watchlist
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userWatchlist = await db.select({
            id: watchlist.id,
            userId: watchlist.userId,
            itemDocId: watchlist.itemDocId,
            createdAt: watchlist.createdAt,
            item: {
                docId: items.docId,
                name: items.name,
                rank: items.rank,
                previousRank: items.previousRank,
                score: items.score,
                lastUpdated: items.lastUpdated,
                categoryId: items.categoryId,
            }
        })
        .from(watchlist)
        .innerJoin(items, eq(watchlist.itemDocId, items.docId))
        .where(eq(watchlist.userId, req.uid!));

        res.json({ watchlist: userWatchlist });
    } catch (error) {
        console.error("Fetch watchlist error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/watchlist/:itemId
router.post("/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        await db.insert(watchlist).values({
            userId: req.uid!,
            itemDocId: req.params.itemId
        }).onConflictDoNothing();

        res.json({ success: true });
    } catch (error) {
        console.error("Add watchlist error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/watchlist/:itemId
router.delete("/:itemId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        await db.delete(watchlist).where(
            and(
                eq(watchlist.userId, req.uid!),
                eq(watchlist.itemDocId, req.params.itemId)
            )
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Delete watchlist error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
