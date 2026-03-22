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
            bio: users.bio,
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
        const { oracleHandle, displayName, bio } = req.body;
        const updates: any = {};
        const now = new Date();

        const currentUser = await db.select({
            firebaseUid: users.firebaseUid,
            oracleHandle: users.oracleHandle,
            oracleHandleChangeCount: users.oracleHandleChangeCount,
            oracleHandleChangeWindowStart: users.oracleHandleChangeWindowStart,
        })
            .from(users)
            .where(eq(users.firebaseUid, req.uid!))
            .limit(1);

        if (!currentUser.length) {
            return res.status(404).json({ error: "User not found" });
        }

        if (displayName !== undefined) {
            updates.displayName = displayName;
        }

        if (oracleHandle !== undefined) {
            const normalizedHandle = String(oracleHandle).trim();
            // Validation: 3-20 chars, letters/numbers/underscores only
            const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!handleRegex.test(normalizedHandle)) {
                return res.status(400).json({ error: "Invalid Oracle Handle format" });
            }

            // Check if handle is taken by someone else
            const existing = await db.select()
                .from(users)
                .where(eq(users.oracleHandle, normalizedHandle))
                .limit(1);

            if (existing.length && existing[0].firebaseUid !== req.uid) {
                return res.status(409).json({ error: "Oracle Handle already taken" });
            }

            const previousHandle = currentUser[0].oracleHandle || null;
            const isChangingHandle = normalizedHandle !== previousHandle;

            if (isChangingHandle) {
                let windowStart = currentUser[0].oracleHandleChangeWindowStart
                    ? new Date(currentUser[0].oracleHandleChangeWindowStart)
                    : null;
                let changeCount = currentUser[0].oracleHandleChangeCount || 0;
                const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

                if (!windowStart || (now.getTime() - windowStart.getTime()) >= THIRTY_DAYS_MS) {
                    windowStart = now;
                    changeCount = 0;
                }

                if (changeCount >= 2) {
                    return res.status(429).json({
                        error: "Oracle name change limit reached. You can only change it twice every 30 days."
                    });
                }

                updates.oracleHandle = normalizedHandle;
                updates.oracleHandleChangeCount = changeCount + 1;
                updates.oracleHandleChangeWindowStart = windowStart;
            }
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
                bio: users.bio,
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

        // Deterministic 7-day trend from live DB reputation (no random walk; full ledger = future enhancement)
        const history: { day: string; value: number }[] = [];
        const startRep = Math.max(0, currentRep - Math.min(120, Math.floor(currentRep * 0.4)));
        for (let i = 6; i >= 0; i--) {
            const t = i / 6;
            const value = Math.round(startRep + (currentRep - startRep) * (1 - t));
            if (i === 0) {
                history.push({ day: "Today", value: currentRep });
            } else {
                const d = new Date();
                d.setDate(d.getDate() - i);
                history.push({
                    day: d.toLocaleDateString("en-US", { weekday: "short" }),
                    value,
                });
            }
        }

        res.json({ history });
    } catch (error) {
        console.error("Error fetching reputation history:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
