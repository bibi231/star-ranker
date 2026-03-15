import { Router } from "express";
import { db } from "../db/index";
import { marketActivity, users } from "../db/schema";
import { desc, eq } from "drizzle-orm";

const router = Router();

// GET /api/activity — Get latest global activity
router.get("/", async (_req, res) => {
    try {
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
            .orderBy(desc(marketActivity.createdAt))
            .limit(30);

        res.json(result);
    } catch (error: any) {
        console.error("[Activity API] Error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
