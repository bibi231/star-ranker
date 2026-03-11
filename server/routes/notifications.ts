import { Router, Response } from "express";
import { db } from "../db";
import { notifications } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
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

// POST /api/notifications/read-all - Mark all as read
router.post("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        await db.update(notifications)
            .set({ read: true })
            .where(eq(notifications.userId, req.uid!));

        res.json({ success: true });
    } catch (error) {
        console.error("Error marking alerts as read:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/notifications/:id/read - Mark single as read
router.post("/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
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

export default router;
