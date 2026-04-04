import { Router } from "express";
import { db } from "../db/index.js";
import { oracleTrials, trialAttempts, items, dailyQuests } from "../db/schema.js";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

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

            if (randomItems.length < 5) {
                console.warn('[trials] Not enough active items for trial:', randomItems.length);
                return res.status(503).json({ error: "Not enough items available for today's trial. Please try again later." });
            }

            try {
                [trial] = await db.insert(oracleTrials).values({
                    trialDate: today,
                    itemIds: randomItems.map(i => i.id)
                }).returning();
                console.log('[trials] Generated new trial for', today, 'with items:', trial.itemIds);
            } catch (insertErr: any) {
                // Race condition: another request may have created it
                if (insertErr.code === '23505') {
                    [trial] = await db.select().from(oracleTrials).where(eq(oracleTrials.trialDate, today)).limit(1);
                } else {
                    throw insertErr;
                }
            }
        }

        // 4. Fetch item details — ensure itemIds are always integers
        const rawIds = trial.itemIds;
        const safeItemIds: number[] = Array.isArray(rawIds) && rawIds.length > 0
            ? rawIds.map((id: any) => typeof id === 'string' ? parseInt(id, 10) : id).filter((id: number) => !isNaN(id))
            : [];

        if (safeItemIds.length === 0) {
            return res.json({ trialId: trial.id, items: [] });
        }

        const trialItems = await db.select({ id: items.id, name: items.name, imageUrl: items.imageUrl })
            .from(items)
            .where(inArray(items.id, safeItemIds));

        // 5. Enrich with fallback images if missing
        const enrichedItems = trialItems.map(item => {
            if (item.imageUrl) return item;
            
            // Simple deterministic placeholder based on name or generic category
            const name = item.name || "Ascendant Item";
            const seed = encodeURIComponent(name);
            return {
                ...item,
                imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}&backgroundColor=020617`
            };
        });

        // Randomize the order for the user
        const shuffledItems = enrichedItems.sort(() => Math.random() - 0.5);

        res.json({ trialId: trial.id, items: shuffledItems });
    } catch (err: any) {
        console.error("[trials] GET error:", err);
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
        const safeGuessOrder = guessOrder && guessOrder.length > 0 ? guessOrder : [-1];
        const actualItems = await db.select({ id: items.id, score: items.score })
            .from(items)
            .where(inArray(items.id, safeGuessOrder));

        // Map actual correct order
        const correctOrder = [...actualItems].sort((a, b) => (b.score || 0) - (a.score || 0)).map(i => i.id);

        // Simple scoring: 20 points per correct position
        let score = 0;
        guessOrder.forEach((id, idx) => {
            if (id === correctOrder[idx]) score += 20;
        });

        // 2. Fetch all items belonging to these trials to populate the UI
        const trialIds = [trialId];
        const trialItems = await db.select().from(items).where(sql`${items.id} IN ${trialIds}`);

        // 3. Enrich items with fallback images if missing
        const enrichedItems = trialItems.map(item => ({
            ...item,
            imageUrl: item.imageUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${item.id}`
        }));

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
