/**
 * Auth Routes — Beta invite gate + email verification
 */

import { Router } from "express";
import { db } from "../db/index";
import { betaInvites, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = Router();

const inviteSchema = z.object({
    code: z.string().min(3).max(20).transform(v => v.toUpperCase().trim()),
});

/**
 * POST /api/auth/validate-invite — Check if invite code is valid
 */
router.post("/validate-invite", async (req, res) => {
    try {
        const parsed = inviteSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ valid: false, message: "Invalid code format" });
        }

        const { code } = parsed.data;
        const invite = await db.select().from(betaInvites)
            .where(eq(betaInvites.code, code))
            .limit(1);

        if (invite.length === 0 || invite[0].used) {
            return res.status(400).json({ valid: false, message: "Invalid or already used invite code" });
        }

        res.json({ valid: true, code });
    } catch (error: any) {
        res.status(500).json({ valid: false, message: error.message });
    }
});

/**
 * POST /api/auth/redeem-invite — Mark invite code as used after registration
 */
router.post("/redeem-invite", requireAuth, async (req: AuthRequest, res) => {
    try {
        const parsed = inviteSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ redeemed: false, message: "Invalid code format" });
        }

        const { code } = parsed.data;
        const invite = await db.select().from(betaInvites)
            .where(and(eq(betaInvites.code, code), eq(betaInvites.used, false)))
            .limit(1);

        if (invite.length === 0) {
            return res.status(400).json({ redeemed: false, message: "Code invalid or already redeemed" });
        }

        await db.update(betaInvites)
            .set({ used: true, usedBy: req.uid, usedAt: new Date() })
            .where(eq(betaInvites.code, code));

        res.json({ redeemed: true });
    } catch (error: any) {
        res.status(500).json({ redeemed: false, message: error.message });
    }
});

export default router;
