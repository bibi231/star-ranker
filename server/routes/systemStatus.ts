import { Router } from "express";
import { db } from "../db.js";
import { users, stakes, items } from "../db/schema.js";
import { eq, sql, desc, and } from "drizzle-orm";
import { authenticateUser } from "../middleware/auth.js";

const router = Router();

// Publicly accessible system metrics (for the "Pulse" dashboard)
router.get("/", async (req, res) => {
    try {
        const stats = await db.transaction(async (tx) => {
            // 1. Total Liquidity (Sum of all active, non-play stakes)
            const liquidityRes = await tx.select({
                total: sql<number>`COALESCE(SUM(${stakes.amount}), 0)`
            }).from(stakes).where(and(eq(stakes.status, 'active'), eq(stakes.isPlayMode, false)));

            // 2. Active User Count
            const userCountRes = await tx.select({
                count: sql<number>`COUNT(*)`
            }).from(users);

            // 3. Total Epochs (Max epoch ID)
            const totalStakesRes = await tx.select({
                count: sql<number>`COUNT(*)`
            }).from(stakes);

            // 4. Recent Activity (Latest 5 stakes)
            const recentStakes = await tx.select({
                id: stakes.id,
                amount: stakes.amount,
                itemName: stakes.itemName,
                createdAt: stakes.createdAt,
                isPlayMode: stakes.isPlayMode
            })
            .from(stakes)
            .orderBy(desc(stakes.createdAt))
            .limit(5);

            return {
                totalLiquidity: Number(liquidityRes[0].total),
                totalUsers: Number(userCountRes[0].count),
                totalStakes: Number(totalStakesRes[0].count),
                recentActivity: recentStakes
            };
        });

        res.json(stats);
    } catch (error) {
        console.error("System Status Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch system integrity data" });
    }
});

export default router;
