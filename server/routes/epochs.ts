import { Router } from "express";
import { db } from "../db/index";
import { epochs } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/epochs/current — Get the active epoch
router.get("/current", async (_req, res) => {
    try {
        const result = await db
            .select()
            .from(epochs)
            .where(eq(epochs.isActive, true))
            .limit(1);

        if (result.length === 0) {
            return res.status(404).json({ error: "No active epoch" });
        }

        const epoch = result[0];
        res.json({
            ...epoch,
            startTime: epoch.startTime.getTime(),
            endTime: epoch.endTime.getTime(),
            serverTime: Date.now(),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
