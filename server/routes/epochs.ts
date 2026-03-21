import { Router } from "express";
import { db } from "../db/index";
import { epochs, epochSnapshots, items } from "../db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

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
            epochId: e.epochNumber,
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

        const now = new Date();
        const serverTime = now.getTime();

        if (result.length > 0) {
            const epoch = result[0];
            return res.json({
                ...epoch,
                epochId: epoch.epochNumber,
                startTime: epoch.startTime.getTime(),
                endTime: epoch.endTime.getTime(),
                serverTime,
            });
        }

        // Virtual Epoch Fallback (GMT aligned)
        const utcMins = now.getUTCMinutes();
        const startTime = new Date(now);
        startTime.setUTCHours(now.getUTCHours(), utcMins < 30 ? 0 : 30, 0, 0);
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

        res.json({
            epochNumber: 0, // Placeholder for virtual
            epochId: 0,
            isActive: true,
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
            serverTime,
            isVirtual: true
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/epochs/:epochNumber/snapshots — Get rankings for a specific epoch
router.get("/:epochNumber/snapshots", async (req, res) => {
    try {
        const requestedEpochNumber = parseInt(req.params.epochNumber, 10);
        if (!Number.isFinite(requestedEpochNumber)) {
            return res.status(400).json({ error: "Invalid epoch number" });
        }

        // Backward compatibility:
        // Older deployments stored epochSnapshots.epochId as epochs.id,
        // newer deployments store it as epochs.epochNumber.
        const epochRow = await db
            .select({ id: epochs.id, epochNumber: epochs.epochNumber })
            .from(epochs)
            .where(eq(epochs.epochNumber, requestedEpochNumber))
            .limit(1);

        const snapshotEpochCandidates = epochRow.length
            ? [requestedEpochNumber, epochRow[0].id]
            : [requestedEpochNumber];

        const categorySlug = req.query.categorySlug as string;

        const whereClause = categorySlug
            ? and(inArray(epochSnapshots.epochId, snapshotEpochCandidates), eq(epochSnapshots.categorySlug, categorySlug))
            : inArray(epochSnapshots.epochId, snapshotEpochCandidates);

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
