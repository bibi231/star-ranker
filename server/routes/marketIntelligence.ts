import { Router } from "express";
import { db } from "../db/index";
import { marketActivity, users, votes, marketComments, items } from "../db/schema";
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

// GET /api/markets/:id/comments — Get discussion (threaded)
router.get("/:id/comments", async (req, res) => {
    try {
        const { id } = req.params; // docId

        // Resolve itemId from docId
        const [item] = await db.select({ id: items.id }).from(items).where(eq(items.docId, id)).limit(1);
        if (!item) return res.status(404).json({ error: "Item not found" });

        const result = await db
            .select({
                id: marketComments.id,
                userId: marketComments.userId,
                content: marketComments.content,
                createdAt: marketComments.createdAt,
                parentId: marketComments.parentId,
                likes: marketComments.likes,
                userDisplayName: users.displayName,
                oracleHandle: users.oracleHandle,
            })
            .from(marketComments)
            .leftJoin(users, eq(marketComments.userId, users.firebaseUid))
            .where(eq(marketComments.itemId, item.id))
            .orderBy(desc(marketComments.createdAt))
            .limit(100);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/markets/:id/comments — Post comment (supports threading)
router.post("/:id/comments", requireAuth, async (req: AuthRequest, res) => {
    try {
        const id = req.params.id as string;
        const { content, parentId } = req.body;
        const userId = req.uid!;

        if (!content || content.length > 500) return res.status(400).json({ error: "Content required" });

        // Resolve itemId from docId
        const [item] = await db.select({ id: items.id }).from(items).where(eq(items.docId, id)).limit(1);
        if (!item) return res.status(404).json({ error: "Item not found" });

        const [newComment] = await db.insert(marketComments).values({
            userId,
            itemId: item.id,
            content,
            parentId: parentId || null
        }).returning();

        // Update quest progress
        try {
            await db.execute(sql`
                INSERT INTO daily_quests (user_id, quest_date, commented_today)
                VALUES (${userId as string}, CURRENT_DATE, true)
                ON CONFLICT (user_id, quest_date)
                DO UPDATE SET commented_today = true
            `);
        } catch (questErr) {
            console.error("Quest update failed:", questErr);
        }

        res.json(newComment);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/markets/comments/:commentId/like — Like a comment
router.post("/comments/:commentId/like", requireAuth, async (req: AuthRequest, res) => {
    try {
        const commentId = parseInt(req.params.commentId as string);
        if (isNaN(commentId)) return res.status(400).json({ error: "Invalid commentId" });

        const [updated] = await db.update(marketComments)
            .set({ likes: sql`${marketComments.likes} + 1` })
            .where(eq(marketComments.id, commentId))
            .returning();

        res.json(updated);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
