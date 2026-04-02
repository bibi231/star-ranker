import { Router } from "express";
import { db } from "../db/index";
import { oracleTrials, trialAttempts, items, dailyQuests } from "../db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/trials — Get or generate today's trial
router.get("/", async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Check if trial exists for today
        let [trial] = await db.select().from(oracleTrials).where(eq(oracleTrials.trialDate, today)).limit(1);

        if (!trial) {
            // 2. Generate new trial: 5 random active items
            const randomItems = await db.select({ id: items.id, name: items.name, imageUrl: items.imageUrl })
                .from(items)
                .where(eq(items.status, 'active'))
                .orderBy(sql`RANDOM()`)
                .limit(5);

            if (randomItems.length < 5) return res.status(500).json({ error: "Insufficient items for trial" });

            [trial] = await db.insert(oracleTrials).values({
                trialDate: today,
                itemIds: randomItems.map(i => i.id)
            }).returning();
        }

        // 3. Fetch item details (without their ranks/scores to avoid cheating)
        const trialItems = await db.select({ id: items.id, name: items.name, imageUrl: items.imageUrl })
            .from(items)
            .where(sql`${items.id} IN ${sql.raw(`(${trial.itemIds?.toString()})`)}`);

        // Randomize the order for the user
        const shuffledItems = trialItems.sort(() => Math.random() - 0.5);

        res.json({ trialId: trial.id, items: shuffledItems });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/trials/submit — Submit a guess
router.post("/submit", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.uid!;
        const { trialId, guessOrder } = req.body; // array of item IDs in guessed order (highest to lowest score)

        if (!trialId || !Array.isArray(guessOrder)) return res.status(400).json({ error: "Trial ID and guess order required" });

        // Check if already attempted
        const [existing] = await db.select().from(trialAttempts)
            .where(and(eq(trialAttempts.userId, userId), eq(trialAttempts.trialId, trialId)))
            .limit(1);
        if (existing) return res.status(400).json({ error: "Trial already completed for today" });

        // Fetch actual scores for these items
        const actualItems = await db.select({ id: items.id, score: items.score })
            .from(items)
            .where(sql`${items.id} IN ${sql.raw(`(${guessOrder.toString()})`)}`);

        // Map actual correct order
        const correctOrder = [...actualItems].sort((a, b) => (b.score || 0) - (a.score || 0)).map(i => i.id);

        // Simple scoring: 20 points per correct position
        let score = 0;
        guessOrder.forEach((id, idx) => {
            if (id === correctOrder[idx]) score += 20;
        });

        // Save attempt
        const [attempt] = await db.insert(trialAttempts).values({
            userId,
            trialId,
            guessOrder,
            score
        }).returning();

        // Bonus: Update quest progress (placeholder for daily participation)
        // If they did the trial, we could award something or mark a specific quest
        // For now, I'll just return the results

        res.json({ 
            score, 
            correctOrderDetails: actualItems.sort((a, b) => (b.score || 0) - (a.score || 0)) 
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
