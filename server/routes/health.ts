/**
 * System Health & Diagnostics — Monitoring Oracle performance
 */

import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { cacheGet, cacheSet } from "../services/cache.js";

const router = Router();

// Fast wakeup ping — NO DB query so Render cold-start returns ASAP.
// Used by UptimeRobot / keepalive pingers and the frontend warmup splash.
router.get("/", (_req, res) => {
    res.json({ status: "ok", ts: Date.now(), uptime: process.uptime() });
});

router.get("/diagnostics", async (_req, res) => {
    const start = Date.now();
    const stats: any = {
        status: "operational",
        timestamp: new Date().toISOString(),
        checks: {}
    };

    try {
        // 1. Database Check + Latency
        const dbStart = Date.now();
        await db.execute(sql`SELECT 1`);
        stats.checks.database = {
            status: "connected",
            latencyMs: Date.now() - dbStart
        };

        // 2. Redis Check + Latency
        const redisStart = Date.now();
        const testKey = `health_test_${Date.now()}`;
        await cacheSet(testKey, "OK", 5);
        const redisVal = await cacheGet(testKey);
        stats.checks.redis = {
            status: redisVal === "OK" ? "connected" : "fallback_mode",
            latencyMs: Date.now() - redisStart
        };

        // 3. Environment Context
        stats.environment = {
            nodeEnv: process.env.NODE_ENV,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };

        stats.totalLatencyMs = Date.now() - start;
        res.json(stats);
    } catch (err: any) {
        stats.status = "degraded";
        stats.error = err.message;
        res.status(500).json(stats);
    }
});

export default router;
