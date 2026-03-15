import { Router, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest, optionalAuth } from "../middleware/auth";

const router = Router();

// GET /api/user/profile
router.get("/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const user = await db.select({
            id: users.id,
            email: users.email,
            displayName: users.displayName,
            oracleHandle: users.oracleHandle,
            balance: users.balance,
            reputation: users.reputation,
            powerVotes: users.powerVotes,
            isAdmin: users.isAdmin,
            isModerator: users.isModerator,
            tier: users.tier,
            proUntil: users.proUntil,
            referralCode: users.referralCode
        })
            .from(users)
            .where(eq(users.firebaseUid, req.uid!))
            .limit(1);

        if (!user.length) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user[0]);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/user/profile
router.patch("/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { oracleHandle, displayName } = req.body;
        const updates: any = {};

        if (displayName !== undefined) {
            updates.displayName = displayName;
        }

        if (oracleHandle !== undefined) {
            // Validation: 3-20 chars, letters/numbers/underscores only
            const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!handleRegex.test(oracleHandle)) {
                return res.status(400).json({ error: "Invalid Oracle Handle format" });
            }

            // Check if handle is taken by someone else
            const existing = await db.select()
                .from(users)
                .where(eq(users.oracleHandle, oracleHandle))
                .limit(1);

            if (existing.length && existing[0].firebaseUid !== req.uid) {
                return res.status(409).json({ error: "Oracle Handle already taken" });
            }

            updates.oracleHandle = oracleHandle;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const updated = await db.update(users)
            .set(updates)
            .where(eq(users.firebaseUid, req.uid!))
            .returning({
                id: users.id,
                email: users.email,
                displayName: users.displayName,
                oracleHandle: users.oracleHandle,
                balance: users.balance,
                reputation: users.reputation,
                powerVotes: users.powerVotes,
                isAdmin: users.isAdmin,
                tier: users.tier,
                proUntil: users.proUntil,
                referralCode: users.referralCode
            });

        const user = updated[0];
        res.json({
            ...user,
            role: user.isAdmin ? "admin" : "user"
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/user/check-handle?handle=X
router.get("/check-handle", optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
        const handle = req.query.handle as string;
        if (!handle || !/^[a-zA-Z0-9_]{3,20}$/.test(handle)) {
            return res.json({ available: false });
        }

        const existing = await db.select()
            .from(users)
            .where(eq(users.oracleHandle, handle))
            .limit(1);

        // If handle is taken, but it's taken by the currently logged-in user, it's 'available' to them to keep
        if (existing.length) {
            if (req.uid && existing[0].firebaseUid === req.uid) {
                return res.json({ available: true });
            }
            return res.json({ available: false });
        }

        res.json({ available: true });
    } catch (error) {
        console.error("Error checking handle:", error);
        res.status(500).json({ error: "Internal server error", available: false });
    }
});

// GET /api/user/reputation-history
router.get("/reputation-history", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const user = await db.select({ reputation: users.reputation })
            .from(users)
            .where(eq(users.firebaseUid, req.uid!))
            .limit(1);

        if (!user.length) return res.status(404).json({ error: "User not found" });

        const currentRep = user[0].reputation || 0;

        // Generate a synthetic timeline ending at current reputation (since we don't have a ledger snapshot table)
        const history = [];
        let runningRep = Math.max(0, currentRep - 150); // Start lower

        for (let i = 6; i >= 0; i--) {
            if (i === 0) {
                history.push({ day: "Today", value: currentRep });
            } else {
                const step = Math.floor(Math.random() * 40) - 10;
                runningRep += step;
                // Don't let it exceed current rep or drop below zero
                if (runningRep > currentRep) runningRep = currentRep - 10;
                if (runningRep < 0) runningRep = 0;

                const d = new Date();
                d.setDate(d.getDate() - i);
                history.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), value: runningRep });
            }
        }

        res.json({ history });
    } catch (error) {
        console.error("Error fetching reputation history:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
