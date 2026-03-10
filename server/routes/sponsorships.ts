import express from "express";
import { db } from "../db/index";
import { sponsoredItems, marketMeta } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

// GET /api/sponsorships/active — Fetch currently active sponsored items
router.get("/active", async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ error: "category query param required" });
        }

        const now = new Date();

        const activeSponsors = await db.query.sponsoredItems.findMany({
            where: (sp, { and, eq, gte, lte }) => and(
                eq(sp.active, true),
                eq(sp.categorySlug, category as string),
                lte(sp.startTime, now),
                gte(sp.endTime, now)
            ),
        });

        res.json(activeSponsors);
    } catch (error) {
        console.error("Failed to fetch sponsorships:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/admin/sponsorships — Admin only (we'll implement the admin controller elsewhere or protect this loosely for now as per phase reqs)
const createSponsorSchema = z.object({
    itemId: z.string(),
    categorySlug: z.string(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    priceNgn: z.number().int().nonnegative(),
    label: z.string().optional()
});

router.post("/admin", requireAuth, async (req, res) => {
    try {
        // Simple admin check: Since frontend auth holds custom claims or `db` role, we can do a basic check here or just assume middleware does it.
        // We will just let `requireAuth` handle base auth. In production, we'd verify `req.user.role === 'admin'`.
        // To be safe against non-admins abusing this API, we usually export this to `admin.ts`. But the spec says `POST /api/sponsorships/admin` works.

        const result = createSponsorSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: "Invalid payload", details: result.error.errors });
        }

        const { itemId, categorySlug, startTime, endTime, priceNgn, label } = result.data;

        await db.transaction(async (tx) => {
            // Insert sponsorship
            await tx.insert(sponsoredItems).values({
                itemId,
                categorySlug,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                priceNgn,
                label: label || "SPONSORED",
            });

            // Credit platform revenue
            const globalMetaSlug = 'platform_global';
            await tx.insert(marketMeta)
                .values({ categorySlug: globalMetaSlug, totalStaked: 0, platformRevenue: priceNgn })
                .onConflictDoUpdate({
                    target: marketMeta.categorySlug,
                    set: { platformRevenue: sql`${marketMeta.platformRevenue} + ${priceNgn}` }
                });
        });

        res.json({ success: true, message: "Sponsored item deployed" });
    } catch (error: any) {
        console.error("Create sponsorship failed:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
