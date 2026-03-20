/**
 * Auth Routes
 */

import { Router } from "express";
import { db } from "../db/index";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = Router();

const bindWalletSchema = z.object({
    walletAddress: z.string().min(42).max(42),
});

/**
 * POST /api/auth/bind-wallet — Bind Web3 wallet to user account
 */
router.post("/bind-wallet", requireAuth, async (req: AuthRequest, res) => {
    try {
        const parsed = bindWalletSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, message: "Invalid wallet address format" });
        }

        const { walletAddress } = parsed.data;

        // Check if wallet is already bound to another user
        const existing = await db.select().from(users).where(eq(users.walletAddress, walletAddress)).limit(1);
        if (existing.length > 0 && existing[0].firebaseUid !== req.uid) {
            return res.status(400).json({ success: false, message: "Wallet already bound to another account" });
        }

        await db.update(users)
            .set({ walletAddress })
            .where(eq(users.firebaseUid, req.uid!));

        res.json({ success: true, walletAddress });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
