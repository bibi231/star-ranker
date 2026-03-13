import { Router } from "express";
import { db } from "../db/index";
import { epochs, epochSnapshots, items } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// GET /api/epochs — Get recent epoch history
router.get("/", async (_req, res) => {
    try {
        const history = await db
            .select()
            .from(epochs)
            .orderBy(desc(epochs.epochNumber))
            .limit(20);

        res.json(history.map(e => ({
            ...e,
            startTime: e.startTime.getTime(),
            endTime: e.endTime.getTime(),
        })));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

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

// GET /api/epochs/:epochNumber/snapshots — Get rankings for a specific epoch
router.get("/:epochNumber/snapshots", async (req, res) => {
    try {
        const { epochNumber } = req.params;
        const categorySlug = req.query.categorySlug as string;

        const whereClause = categorySlug
            ? and(eq(epochSnapshots.epochId, parseInt(epochNumber)), eq(epochSnapshots.categorySlug, categorySlug))
            : eq(epochSnapshots.epochId, parseInt(epochNumber));

        // Join with items to get names
        const snapshots = await db
            .select({
                id: epochSnapshots.id,
                itemId: epochSnapshots.itemId,
                categorySlug: epochSnapshots.categorySlug,
                rank: epochSnapshots.rank,
                score: epochSnapshots.score,
                velocity: epochSnapshots.velocity,
                name: items.name,
            })
            .from(epochSnapshots)
            .leftJoin(items, eq(epochSnapshots.itemId, items.docId))
            .where(whereClause)
            .orderBy(epochSnapshots.rank);

        res.json(snapshots);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
