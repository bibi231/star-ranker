import { Router } from "express";
import { db } from "../db/index";
import { epochs, epochSnapshots, items } from "../db/schema";
import { eq, desc, and, count, max } from "drizzle-orm";
import { createEpochSnapshot } from "../engine/rankingEngine";

const router = Router();

// GET /api/epochs/diagnostics — lightweight diagnostics for epoch/snapshot health
router.get("/diagnostics", async (_req, res) => {
    try {
        const [active] = await db
            .select({ id: epochs.id, epochNumber: epochs.epochNumber, startTime: epochs.startTime, endTime: epochs.endTime })
            .from(epochs)
            .where(eq(epochs.isActive, true))
            .limit(1);

        const [epochTotals] = await db
            .select({
                totalEpochs: count(),
                maxEpochNumber: max(epochs.epochNumber),
            })
            .from(epochs);

        const [snapshotTotals] = await db
            .select({
                totalSnapshots: count(),
                maxSnapshotEpochId: max(epochSnapshots.epochId),
            })
            .from(epochSnapshots);

        res.json({
            activeEpoch: active || null,
            totals: {
                epochs: Number(epochTotals?.totalEpochs || 0),
                maxEpochNumber: epochTotals?.maxEpochNumber ?? null,
                snapshots: Number(snapshotTotals?.totalSnapshots || 0),
                maxSnapshotEpochId: snapshotTotals?.maxSnapshotEpochId ?? null,
            },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/epochs/force-snapshot?key=API_SEED_KEY
// Emergency/manual snapshot capture for current active epoch.
router.post("/force-snapshot", async (req, res) => {
    try {
        const secret = process.env.API_SEED_KEY;
        if (!secret) return res.status(503).json({ error: "Force snapshot is not enabled (API_SEED_KEY missing)." });
        if (req.query.key !== secret) return res.status(403).json({ error: "Invalid or missing key query parameter" });

        const [active] = await db
            .select({ epochNumber: epochs.epochNumber })
            .from(epochs)
            .where(eq(epochs.isActive, true))
            .limit(1);

        if (!active) return res.status(404).json({ error: "No active epoch found" });

        await createEpochSnapshot(active.epochNumber);

        const [totals] = await db
            .select({ snapshotCount: count() })
            .from(epochSnapshots)
            .where(eq(epochSnapshots.epochId, active.epochNumber));

        return res.json({
            success: true,
            epochNumber: active.epochNumber,
            snapshotCount: Number(totals?.snapshotCount || 0),
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to force snapshot" });
    }
});

// GET /api/epochs — Get recent epoch history
router.get("/", async (_req, res) => {
    try {
        // Pull enough rows to survive duplicate epoch_number rows (no unique constraint in DB)
        const history = await db
            .select()
            .from(epochs)
            .orderBy(desc(epochs.epochNumber))
            .limit(80);

        const bestByNumber = new Map<number, typeof history[0]>();
        for (const e of history) {
            const prev = bestByNumber.get(e.epochNumber);
            if (!prev || e.id > prev.id) bestByNumber.set(e.epochNumber, e);
        }

        const unique = Array.from(bestByNumber.values())
            .sort((a, b) => b.epochNumber - a.epochNumber)
            .slice(0, 20);

        res.json(unique.map(e => ({
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

        // Legacy stored epoch_snapshots.epoch_id as epochs.id; newer code uses epochs.epochNumber.
        // Using IN (both) returns two full snapshot sets → every row doubled in the UI.
        const hasSnapshotsForEpochNumber = await db
            .select({ id: epochSnapshots.id })
            .from(epochSnapshots)
            .where(eq(epochSnapshots.epochId, requestedEpochNumber))
            .limit(1);

        let resolvedSnapshotEpochId = requestedEpochNumber;
        if (hasSnapshotsForEpochNumber.length === 0 && epochRow.length > 0) {
            const hasLegacy = await db
                .select({ id: epochSnapshots.id })
                .from(epochSnapshots)
                .where(eq(epochSnapshots.epochId, epochRow[0].id))
                .limit(1);
            if (hasLegacy.length > 0) resolvedSnapshotEpochId = epochRow[0].id;
        }

        const categorySlug = req.query.categorySlug as string;

        const whereClause = categorySlug
            ? and(eq(epochSnapshots.epochId, resolvedSnapshotEpochId), eq(epochSnapshots.categorySlug, categorySlug))
            : eq(epochSnapshots.epochId, resolvedSnapshotEpochId);

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

        // Safety: if DB ever has duplicate snapshot rows for same item+epoch, keep one
        const dedup = new Map<string, typeof snapshots[0]>();
        for (const row of snapshots) {
            const k = `${row.itemId}|${row.categorySlug}`;
            if (!dedup.has(k)) dedup.set(k, row);
        }
        res.json(Array.from(dedup.values()).sort((a, b) => a.rank - b.rank));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
