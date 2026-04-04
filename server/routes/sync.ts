import { Router, Request, Response } from "express";
import { reifyRankings } from "../engine/rankingEngine.js";
import { checkAndRollEpoch } from "../engine/epochScheduler.js";
import { updateCryptoPrices } from "../engine/coinGecko.js";
import { runZeitgeistDiscovery } from "../engine/zeitgeist.js";

const router = Router();

/**
 * GET /api/sync
 * 
 * Trigger point for Vercel Cron jobs or manual administrative sync.
 * Executes one iteration for all critical background engines.
 */
router.get("/", async (req: Request, res: Response) => {
    const cronSecret = process.env.CRON_SECRET || "dev_secret";
    const providedSecret = req.headers['authorization']?.replace('Bearer ', '') || req.query.key;

    if (providedSecret !== cronSecret && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: "Unauthorized sync attempt" });
    }

    console.log(`[Sync] Starting manual synchronization...`);
    const results: any = {};

    try {
        // 1. Rankings & Momentum
        console.log("[Sync] Executing Ranking Engine...");
        await reifyRankings();
        results.rankings = "ok";

        // 2. Epochs & Settlement
        console.log("[Sync] Executing Epoch Scheduler...");
        await checkAndRollEpoch();
        results.epochs = "ok";

        // 3. Crypto Price Feed
        console.log("[Sync] Executing CoinGecko Feed...");
        await updateCryptoPrices();
        results.crypto = "ok";

        // 4. Cultural Zeitgeist
        console.log("[Sync] Executing Zeitgeist Discovery...");
        await runZeitgeistDiscovery();
        results.zeitgeist = "ok";

        res.json({
            status: "success",
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error: any) {
        console.error("[Sync] Synchronization failed:", error);
        res.status(500).json({
            status: "error",
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
