import { Router } from "express";
import { db } from "../db/index";
import { seasons, seasonLeaderboard, users } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/seasons — List all seasons
router.get("/", async (req, res) => {
    try {
        const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));
        res.json(allSeasons);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/seasons/:id/leaderboard — Get leaderboard for a specific season
router.get("/:id/leaderboard", async (req, res) => {
    try {
        const seasonId = parseInt(req.params.id);
        
        const leaderboard = await db.select({
            userId: seasonLeaderboard.userId,
            xp: seasonLeaderboard.seasonXP,
            tier: seasonLeaderboard.tier,
            displayName: users.displayName,
            oracleHandle: users.oracleHandle
        })
        .from(seasonLeaderboard)
        .leftJoin(users, eq(seasonLeaderboard.userId, users.firebaseUid))
        .where(eq(seasonLeaderboard.seasonId, seasonId))
        .orderBy(desc(seasonLeaderboard.seasonXP))
        .limit(100);

        res.json(leaderboard);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
