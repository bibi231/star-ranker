import { Router } from "express";
import { db } from "../db/index";
import { marketComments, users, items } from "../db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/items/:itemId/comments — Public, paginated, newest first
router.get("/item/:itemId", async (req, res) => {
    try {
        const itemId = parseInt(req.params.itemId);
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        if (isNaN(itemId)) {
            return res.status(400).json({ error: "Invalid itemId" });
        }

        const comments = await db
            .select({
                id: marketComments.id,
                content: marketComments.content,
                likes: marketComments.likes,
                createdAt: marketComments.createdAt,
                parentId: marketComments.parentId,
                user: {
                    displayName: users.displayName,
                    oracleHandle: users.oracleHandle,
                }
            })
            .from(marketComments)
            .leftJoin(users, eq(marketComments.userId, users.firebaseUid))
            .where(eq(marketComments.itemId, itemId))
            .orderBy(desc(marketComments.createdAt))
            .limit(limit)
            .offset(offset);

        const totalResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(marketComments)
            .where(eq(marketComments.itemId, itemId));

        res.json({ 
            comments, 
            total: totalResult[0].count 
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/items/:itemId/comments — requireAuth, body: { content, parentId }
router.post("/item/:itemId", requireAuth, async (req: AuthRequest, res) => {
    try {
        const itemId = parseInt(req.params.itemId);
        const { content, parentId } = req.body;
        const userId = req.uid!;

        if (isNaN(itemId) || !content || content.length > 500) {
            return res.status(400).json({ error: "itemId and valid content (max 500 chars) required" });
        }

        const [newComment] = await db.insert(marketComments).values({
            itemId,
            userId,
            content,
            parentId: parentId || null
        }).returning();

        // Update quest progress (placeholder for Feature C logic)
        // In a real app, I'd have a service for this
        try {
            await db.execute(sql`
                INSERT INTO daily_quests (user_id, quest_date, commented_today)
                VALUES (${userId}, CURRENT_DATE, true)
                ON CONFLICT (user_id, quest_date)
                DO UPDATE SET commented_today = true
            `);
        } catch (questErr) {
            console.error("Quest update failed:", questErr);
        }

        res.json(newComment);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/comments/:commentId/like — requireAuth, toggle like
router.post("/:commentId/like", requireAuth, async (req: AuthRequest, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        if (isNaN(commentId)) return res.status(400).json({ error: "Invalid commentId" });

        // Simple atomic increment for now (Manifold actually tracks who liked what, 
        // but this is the simplest "competitive parity" version requested)
        const [updated] = await db.update(marketComments)
            .set({ likes: sql`${marketComments.likes} + 1` })
            .where(eq(marketComments.id, commentId))
            .returning();

        res.json(updated);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/comments/:commentId — requireAuth, only own comments
router.delete("/:commentId", requireAuth, async (req: AuthRequest, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.uid!;

        if (isNaN(commentId)) return res.status(400).json({ error: "Invalid commentId" });

        const [deleted] = await db.delete(marketComments)
            .where(and(eq(marketComments.id, commentId), eq(marketComments.userId, userId)))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: "Comment not found or unauthorized" });
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
