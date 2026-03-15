import { Router, Response } from "express";
import { db } from "../db";
import { notifications } from "../db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/notifications - Get all user notifications
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userNotifications = await db.select()
            .from(notifications)
            .where(eq(notifications.userId, req.uid!))
            .orderBy(desc(notifications.createdAt))
            .limit(50);

        res.json(userNotifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        await db.update(notifications)
            .set({ read: true })
            .where(eq(notifications.userId, req.uid!));

        res.json({ success: true, count: 0 });
    } catch (error) {
        console.error("Error marking alerts as read:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch("/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        await db.update(notifications)
            .set({ read: true })
            .where(and(
                eq(notifications.id, parseInt(req.params.id as string)),
                eq(notifications.userId, req.uid!)
            ));

        res.json({ success: true });
    } catch (error) {
        console.error("Error marking alert as read:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/notifications/unread-count
router.get("/unread-count", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.select({ count: count() })
            .from(notifications)
            .where(and(eq(notifications.userId, req.uid!), eq(notifications.read, false)));

        res.json({ count: result[0]?.count || 0 });
    } catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
