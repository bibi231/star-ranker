import { Router } from "express";
import { db } from "../db/index";
import { marketActivity, users, votes, comments, items } from "../db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/markets/:id/activity — Get activity for a specific item
router.get("/:id/activity", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db
            .select({
                id: marketActivity.id,
                type: marketActivity.type,
                userId: marketActivity.userId,
                itemDocId: marketActivity.itemDocId,
                itemName: marketActivity.itemName,
                categorySlug: marketActivity.categorySlug,
                amount: marketActivity.amount,
                description: marketActivity.description,
                metadata: marketActivity.metadata,
                createdAt: marketActivity.createdAt,
                userDisplayName: users.displayName,
            })
            .from(marketActivity)
            .leftJoin(users, eq(marketActivity.userId, users.firebaseUid))
            .where(eq(marketActivity.itemDocId, id))
            .orderBy(desc(marketActivity.createdAt))
            .limit(20);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/markets/:id/stats — Get sentiment bias & stats
router.get("/:id/stats", async (req, res) => {
    try {
        const { id } = req.params;

        const [item] = await db.select().from(items).where(eq(items.docId, id)).limit(1);
        if (!item) return res.status(404).json({ error: "Item not found" });

        const upVotes = await db.select({ count: sql<number>`count(*)` })
            .from(votes)
            .where(and(eq(votes.itemDocId, id), eq(votes.direction, 1)));

        const downVotes = await db.select({ count: sql<number>`count(*)` })
            .from(votes)
            .where(and(eq(votes.itemDocId, id), eq(votes.direction, -1)));

        const total = (Number(upVotes[0]?.count) || 0) + (Number(downVotes[0]?.count) || 0);
        const bullish = total > 0 ? Math.round((Number(upVotes[0]?.count) / total) * 100) : 50;

        res.json({
            bullish,
            bearish: 100 - bullish,
            totalVotes: total,
            score: item.score,
            rank: item.rank
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/markets/:id/comments — Get discussion
router.get("/:id/comments", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db
            .select({
                id: comments.id,
                userId: comments.userId,
                content: comments.content,
                createdAt: comments.createdAt,
                userDisplayName: users.displayName,
                userPhoto: users.oracleHandle, // Use handle or just name
            })
            .from(comments)
            .leftJoin(users, eq(comments.userId, users.firebaseUid))
            .where(eq(comments.itemDocId, id))
            .orderBy(desc(comments.createdAt))
            .limit(50);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/markets/:id/comments — Post comment
router.post("/:id/comments", requireAuth, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.uid!;

        if (!content) return res.status(400).json({ error: "Content required" });

        await db.insert(comments).values({
            userId,
            itemDocId: id as string,
            content
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
