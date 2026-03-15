import { Router } from "express";
import { db } from "../db/index";
import { votes, items, users, marketActivity } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/votes — Cast vote (toggle)
router.post("/", requireAuth, async (req: AuthRequest, res) => {
    try {
        const { itemDocId, direction, categorySlug, usePowerVote } = req.body;
        const userId = req.uid!;

        if (!itemDocId || direction === undefined || !categorySlug) {
            return res.status(400).json({ error: "itemDocId, direction, categorySlug required" });
        }

        if (![1, -1, 0].includes(direction)) {
            return res.status(400).json({ error: "direction must be 1, -1, or 0" });
        }

        // Check existing vote
        const existing = await db
            .select()
            .from(votes)
            .where(and(eq(votes.userId, userId), eq(votes.itemDocId, itemDocId)))
            .limit(1);

        const previousDirection = existing.length > 0 ? existing[0].direction : 0;
        let scoreDelta = direction - previousDirection;
        let powerVoteDeducted = false;

        if (usePowerVote && direction !== 0) {
            const userRec = await db.query.users.findFirst({
                where: eq(users.firebaseUid, userId)
            });
            if (userRec && (userRec.powerVotes || 0) > 0) {
                scoreDelta *= 3;
                powerVoteDeducted = (previousDirection === 0); // Only deduct for new votes
            }
        }

        await db.transaction(async (tx) => {
            if (powerVoteDeducted) {
                await tx.update(users)
                    .set({ powerVotes: sql`${users.powerVotes} - 1` })
                    .where(eq(users.firebaseUid, userId));
            }

            // Update item score
            if (scoreDelta !== 0) {
                const voteCountDelta = direction !== 0 && previousDirection === 0 ? 1
                    : direction === 0 && previousDirection !== 0 ? -1
                        : 0;

                await tx.update(items)
                    .set({
                        score: sql`${items.score} + ${scoreDelta}`,
                        totalVotes: sql`${items.totalVotes} + ${voteCountDelta}`,
                    })
                    .where(eq(items.docId, itemDocId));
            }

            // Upsert or delete vote
            if (direction === 0) {
                if (existing.length > 0) {
                    await tx.delete(votes)
                        .where(and(eq(votes.userId, userId), eq(votes.itemDocId, itemDocId)));
                }
            } else if (existing.length > 0) {
                await tx.update(votes)
                    .set({ direction, updatedAt: new Date() })
                    .where(and(eq(votes.userId, userId), eq(votes.itemDocId, itemDocId)));
            } else {
                await tx.insert(votes).values({
                    userId,
                    itemDocId,
                    categorySlug,
                    direction,
                });
            }

            // Log to market activity (safe fetch)
            try {
                await tx.insert(marketActivity).values({
                    type: "vote",
                    userId,
                    itemDocId,
                    categorySlug,
                    description: `${powerVoteDeducted ? 'POWER VOTE' : 'Vote'} cast (${direction === 1 ? 'up' : direction === -1 ? 'down' : 'cleared'}) on ${itemDocId}`,
                    metadata: { direction, usePowerVote: powerVoteDeducted }
                });
            } catch (e) {
                console.warn("[Voting] Market activity log failed (possibly missing table):", e);
            }
        });

        // Get updated score
        const updated = await db
            .select({ score: items.score })
            .from(items)
            .where(eq(items.docId, itemDocId))
            .limit(1);

        res.json({ success: true, newScore: updated[0]?.score ?? 0 });
    } catch (error: any) {
        console.error("Vote error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/votes?category=crypto — Get user's votes for a category
router.get("/", requireAuth, async (req: AuthRequest, res) => {
    try {
        const categorySlug = req.query.category as string;
        if (!categorySlug) {
            return res.status(400).json({ error: "category query param required" });
        }

        const result = await db
            .select()
            .from(votes)
            .where(and(
                eq(votes.userId, req.uid!),
                eq(votes.categorySlug, categorySlug)
            ));

        // Map to { itemDocId: 'up'|'down' }
        const voteMap: Record<string, string> = {};
        result.forEach(v => {
            voteMap[v.itemDocId] = v.direction === 1 ? "up" : "down";
        });

        res.json(voteMap);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
