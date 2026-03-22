/**
 * Leaderboard API routes
 */

import { Router } from "express";
import { db } from "../db/index";
import { users, stakes } from "../db/schema";
import { desc, eq, sql, count, or, isNull } from "drizzle-orm";

const router = Router();

// GET /api/leaderboard — Top users by reputation
router.get("/", async (req, res) => {
    try {
        const limitParam = parseInt(req.query.limit as string) || 20;

        const result = await db
            .select({
                displayName: users.displayName,
                reputation: users.reputation,
                balance: users.balance,
                tier: users.tier,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(or(eq(users.isBanned, false), isNull(users.isBanned)))
            .orderBy(desc(users.reputation))
            .limit(limitParam);

        // Add rank numbers
        const leaderboard = result.map((user, idx) => ({
            rank: idx + 1,
            ...user,
        }));

        res.json(leaderboard);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/leaderboard/stats — Platform-wide statistics
router.get("/stats", async (req, res) => {
    try {
        const [userCount] = await db.select({ count: count() }).from(users);
        const [stakeCount] = await db.select({ count: count() }).from(stakes);
        const [totalWagered] = await db
            .select({ total: sql<number>`COALESCE(SUM(${stakes.amount}), 0)` })
            .from(stakes);
        const [totalWon] = await db
            .select({ total: sql<number>`COALESCE(SUM(${stakes.payout}), 0)` })
            .from(stakes)
            .where(eq(stakes.status, "won"));

        res.json({
            totalUsers: userCount.count,
            totalStakes: stakeCount.count,
            totalWagered: totalWagered.total,
            totalWon: totalWon.total,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
