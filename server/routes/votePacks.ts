import express from "express";
import { db } from "../db/index";
import { votePacks, users, marketMeta } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const packs = await db.query.votePacks.findMany({
            where: eq(votePacks.active, true),
            orderBy: (vp, { asc }) => [asc(vp.priceNgn)],
        });
        res.json(packs);
    } catch (error) {
        console.error("Failed to fetch vote packs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const purchaseSchema = z.object({
    packId: z.number().int().positive(),
});

router.post("/purchase", requireAuth, async (req, res) => {
    try {
        const result = purchaseSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: "Invalid payload", details: result.error.errors });
        }

        const { packId } = result.data;
        const userUid = req.user!.uid;

        // Fetch pack
        const pack = await db.query.votePacks.findFirst({
            where: eq(votePacks.id, packId),
        });

        if (!pack || !pack.active) {
            return res.status(404).json({ error: "Vote pack not found or inactive" });
        }

        const success = await db.transaction(async (tx) => {
            // Fetch user
            const [user] = await tx.select().from(users).where(eq(users.firebaseUid, userUid)).limit(1);
            if (!user) {
                return { error: "User not found" };
            }

            if (user.balance < pack.priceNgn) {
                return { error: "Insufficient balance to purchase this pack" };
            }

            // Deduct balance and add powerVotes
            const [updatedUser] = await tx.update(users)
                .set({
                    balance: user.balance - pack.priceNgn,
                    powerVotes: (user.powerVotes || 0) + pack.votes,
                })
                .where(eq(users.firebaseUid, userUid))
                .returning({ balance: users.balance, powerVotes: users.powerVotes });

            // Credit platform revenue
            // Global metadata row uses a specific slug "platform" for overall revenue unassociated with a category. Wait, we use specific categories in marketMeta, but for global revenue we can use a "platform_global" row or similar.
            // Let's check if we have a global meta row, or simply inject into it.
            // Actually, we can just insert/update a specific row for platform revenue.
            // A simpler way: just update a row with categorySlug = 'platform_global'.

            const globalMetaSlug = 'platform_global';
            await tx.insert(marketMeta)
                .values({ categorySlug: globalMetaSlug, totalStaked: 0, platformRevenue: pack.priceNgn })
                .onConflictDoUpdate({
                    target: marketMeta.categorySlug,
                    set: { platformRevenue: db.raw(`${marketMeta.platformRevenue.name} + ${pack.priceNgn}`) }
                });

            return { success: true, newPowerVotes: updatedUser.powerVotes, newBalance: updatedUser.balance };
        });

        if (success.error) {
            return res.status(400).json({ error: success.error });
        }

        res.json(success);

    } catch (error) {
        console.error("Purchase failed:", error);
        res.status(500).json({ error: "Purchase failed" });
    }
});

export default router;
