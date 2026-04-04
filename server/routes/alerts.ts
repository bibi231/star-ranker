import { Router, Response } from "express";
import { db } from "../db.js";
import { priceAlerts, items } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userAlerts = await db.select({
            id: priceAlerts.id,
            itemDocId: priceAlerts.itemDocId,
            alertType: priceAlerts.alertType,
            threshold: priceAlerts.threshold,
            active: priceAlerts.active,
            item: {
                name: items.name,
                rank: items.rank,
                docId: items.docId,
            }
        })
        .from(priceAlerts)
        .innerJoin(items, eq(priceAlerts.itemDocId, items.docId))
        .where(eq(priceAlerts.userId, req.uid!));

        res.json({ alerts: userAlerts });
    } catch (error) {
        console.error("Fetch alerts error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const alertSchema = z.object({
    itemDocId: z.string(),
    alertType: z.enum(["rank_above", "rank_below", "momentum_spike"]),
    threshold: z.number()
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { itemDocId, alertType, threshold } = alertSchema.parse(req.body);

        await db.insert(priceAlerts).values({
            userId: req.uid!,
            itemDocId,
            alertType,
            threshold,
            active: true,
            triggered: false,
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Create alert error:", error);
        res.status(400).json({ error: "Invalid request payload or internal error" });
    }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        await db.delete(priceAlerts).where(
            and(
                eq(priceAlerts.id, parseInt(req.params.id)),
                eq(priceAlerts.userId, req.uid!)
            )
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Delete alert error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
