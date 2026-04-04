import { Router } from "express";
import { db } from "../db/index.js";
import { dailyQuests, users, stakes } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/quests — Get daily quest progress
router.get("/", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.uid!;
        const today = new Date().toISOString().split('T')[0];

        // Ensure quest record exists for today
        let [quest] = await db.select()
            .from(dailyQuests)
            .where(and(eq(dailyQuests.userId, userId), eq(dailyQuests.questDate, today)))
            .limit(1);

        if (!quest) {
            // Check if they've already done things today that weren't tracked in the specific table
            // Primarily 'staked_today' which we can check from the stakes table
            const [todayStake] = await db.select()
                .from(stakes)
                .where(and(
                    eq(stakes.userId, userId),
                    sql`DATE(${stakes.createdAt}) = CURRENT_DATE`
                ))
                .limit(1);

            [quest] = await db.insert(dailyQuests).values({
                userId,
                questDate: today,
                stakedToday: !!todayStake,
                commentedToday: false, // These are updated via their respective routes
                votedToday: false,
                claimed: false
            }).returning();
        }

        res.json(quest);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/quests/claim — Claim rewards for completing all quests
router.post("/claim", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.uid!;
        const today = new Date().toISOString().split('T')[0];

        const [quest] = await db.select()
            .from(dailyQuests)
            .where(and(eq(dailyQuests.userId, userId), eq(dailyQuests.questDate, today)))
            .limit(1);

        if (!quest) return res.status(404).json({ error: "Quest not found" });
        if (quest.claimed) return res.status(400).json({ error: "Rewards already claimed" });

        const allDone = quest.stakedToday && quest.commentedToday && quest.votedToday;
        if (!allDone) return res.status(400).json({ error: "Quests not yet completed" });

        // Grant 50 reputation reward
        await db.transaction(async (tx) => {
            await tx.update(users)
                .set({ reputation: sql`${users.reputation} + 50` })
                .where(eq(users.firebaseUid, userId));

            await tx.update(dailyQuests)
                .set({ claimed: true })
                .where(eq(dailyQuests.id, quest.id));
        });

        res.json({ success: true, reward: 50 });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
