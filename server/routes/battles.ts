import { Router } from "express";
import { db } from "../db/index";
import { oracleBattles, users, items } from "../db/schema";
import { eq, and, sql, desc, gt, aliasedTable } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// Alias table for head-to-head joins
const itemA = aliasedTable(items, "itemA");
const itemB = aliasedTable(items, "itemB");

// GET /api/battles — List active battles
router.get("/", async (req, res) => {
    try {
        const battles = await db
            .select({
                id: oracleBattles.id,
                title: oracleBattles.title,
                question: oracleBattles.question,
                status: oracleBattles.status,
                totalVotesA: oracleBattles.totalVotesA,
                totalVotesB: oracleBattles.totalVotesB,
                endsAt: oracleBattles.endsAt,
                createdAt: oracleBattles.createdAt,
                itemA: { id: itemA.id, name: itemA.name, imageUrl: itemA.imageUrl },
                itemB: { id: itemB.id, name: itemB.name, imageUrl: itemB.imageUrl },
                creator: { displayName: users.displayName, oracleHandle: users.oracleHandle }
            })
            .from(oracleBattles)
            .leftJoin(itemA, eq(oracleBattles.itemAId, itemA.id))
            .leftJoin(itemB, eq(oracleBattles.itemBId, itemB.id))
            .leftJoin(users, eq(oracleBattles.creatorId, users.firebaseUid))
            .where(eq(oracleBattles.status, 'active'))
            .orderBy(desc(oracleBattles.createdAt));

        res.json(battles);
    } catch (err: any) {
        console.error("Battles GET Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/battles — Create a battle (Costs 100 reputation)
router.post("/", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.uid!;
        const { title, question, itemAId, itemBId, endsAt } = req.body;

        if (!title || !question || !itemAId || !itemBId || !endsAt) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Check reputation
        const [user] = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
        if (!user || (user.reputation || 0) < 100) {
            return res.status(403).json({ error: "Insufficient reputation (100 required)" });
        }

        // Transaction: Create battle + Deduct rep
        const result = await db.transaction(async (tx) => {
            await tx.update(users)
                .set({ reputation: sql`${users.reputation} - 100` })
                .where(eq(users.firebaseUid, userId));

            const [newBattle] = await tx.insert(oracleBattles).values({
                creatorId: userId,
                title,
                question,
                itemAId,
                itemBId,
                endsAt: new Date(endsAt),
                status: 'active'
            }).returning();

            return newBattle;
        });

        res.json(result);
    } catch (err: any) {
        console.error("Battles POST Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/battles/:id/vote — Vote in a battle
router.post("/:id/vote", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.uid!;
        const battleId = parseInt(req.params.id as string);
        const { option } = req.body; // 'A' or 'B'

        if (isNaN(battleId) || !['A', 'B'].includes(option)) {
            return res.status(400).json({ error: "Invalid battleId or option" });
        }

        const battle = await db.select().from(oracleBattles).where(eq(oracleBattles.id, battleId)).limit(1);
        if (!battle.length || battle[0].status !== 'active') {
            return res.status(404).json({ error: "Active battle not found" });
        }

        const updateField = option === 'A' ? { totalVotesA: sql`${oracleBattles.totalVotesA} + 1` } : { totalVotesB: sql`${oracleBattles.totalVotesB} + 1` };
        
        const [updated] = await db.update(oracleBattles)
            .set(updateField)
            .where(eq(oracleBattles.id, battleId))
            .returning();

        // Update quest progress
        try {
            await db.execute(sql`
                INSERT INTO daily_quests (user_id, quest_date, voted_today)
                VALUES (${userId as string}, CURRENT_DATE, true)
                ON CONFLICT (user_id, quest_date)
                DO UPDATE SET voted_today = true
            `);
        } catch (questErr) {
            console.error("Battle quest update failed:", questErr);
        }

        res.json(updated);
    } catch (err: any) {
        console.error("Battles VOTE Error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
