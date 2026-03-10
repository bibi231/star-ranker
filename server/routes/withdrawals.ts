/**
 * Withdrawals Route — Skeleton for post-beta
 * Returns 503 with clear messaging.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/request", requireAuth, (_req, res) => {
    res.status(503).json({
        message: "Withdrawals open at full launch — beta balances are converted at go-live.",
        status: "coming_soon",
        estimatedLaunch: "Q3 2026",
    });
});

router.get("/status", requireAuth, (_req, res) => {
    res.status(503).json({
        message: "Withdrawal system is not yet active.",
        status: "coming_soon",
    });
});

export default router;
