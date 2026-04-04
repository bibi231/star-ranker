import { Router, Response, Request } from "express";
import { db } from "../db";
import { users, achievements, marketActivity } from "../db/schema";
import { eq, or, desc } from "drizzle-orm";
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
            demoBalance: users.demoBalance,
            isDemoMode: users.isDemoMode,
            settings: users.settings,
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
        const { oracleHandle, displayName, bio, isDemoMode, settings } = req.body;
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
            updates.displayName = String(displayName).trim();
        }

        if (bio !== undefined) {
            updates.bio = String(bio).trim().substring(0, 500); // 500 char limit
        }
        
        if (isDemoMode !== undefined) {
            updates.isDemoMode = !!isDemoMode;
        }
        
        if (settings !== undefined && typeof settings === 'object') {
            // Merge with existing or overwrite
            updates.settings = settings;
        }

        if (oracleHandle !== undefined) {
            const normalizedHandle = String(oracleHandle).trim().toLowerCase();
            const user = currentUser[0];
            
            // Validation: 3-20 chars, letters/numbers/underscores only
            const handleRegex = /^[a-z0-9_]{3,20}$/;
            if (!handleRegex.test(normalizedHandle)) {
                return res.status(400).json({ error: "Handle must be 3-20 characters, lowercase letters, numbers, and underscores only." });
            }

            // Check if handle is taken by someone else
            if (user.oracleHandle !== normalizedHandle) {
                const existing = await db.select()
                    .from(users)
                    .where(eq(users.oracleHandle, normalizedHandle))
                    .limit(1);

                if (existing.length) {
                    return res.status(409).json({ error: "Oracle Handle already taken" });
                }

                // Oracle Handle change limit: 1x every 60 days
                const lastChange = user.oracleHandleChangeWindowStart ? new Date(user.oracleHandleChangeWindowStart) : null;
                const cooldownDays = 60;
                
                if (lastChange) {
                    const diffTime = Math.abs(now.getTime() - lastChange.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < cooldownDays) {
                        const nextDate = new Date(lastChange.getTime() + (cooldownDays * 24 * 60 * 60 * 1000));
                        return res.status(403).json({ 
                            error: `Oracle Handle can only be changed once every ${cooldownDays} days.`,
                            nextChangeDate: nextDate.toISOString()
                        });
                    }
                }
                
                updates.oracleHandle = normalizedHandle;
                updates.oracleHandleChangeCount = (user.oracleHandleChangeCount || 0) + 1;
                updates.oracleHandleChangeWindowStart = now;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const updated = await db.update(users)
            .set(updates)
            .where(eq(users.firebaseUid, req.uid!))
            .returning();

        const updatedUser = updated[0];
        res.json({
            ...updatedUser,
            role: updatedUser.isAdmin ? "admin" : "user"
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/user/check-handle
router.get("/check-handle", async (req: Request, res: Response) => {
    try {
        const handle = req.query.handle as string;
        if (!handle) return res.status(400).json({ error: "Handle required" });
        
        const existing = await db.select()
            .from(users)
            .where(eq(users.oracleHandle, handle.trim()))
            .limit(1);
            
        res.json({ available: existing.length === 0 });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/user/public/:handle
router.get("/public/:handle", async (req: Request, res: Response) => {
    try {
        const handle = req.params.handle;
        
        const existing = await db.select()
            .from(users)
            .where(
                or(
                    eq(users.oracleHandle, handle),
                    eq(users.displayName, handle)
                )
            )
            .limit(1);

        if (!existing.length) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = existing[0];

        // Ensure user has some default display handle
        const displayHandle = user.oracleHandle || user.displayName || "Unknown_Oracle";

        // Query their recent activity
        let recentActivity: any[] = [];
        try {
            recentActivity = await db.select({
                type: marketActivity.type,
                itemName: marketActivity.itemName,
                createdAt: marketActivity.createdAt
            })
            .from(marketActivity)
            .where(eq(marketActivity.userId, user.firebaseUid))
            .orderBy(desc(marketActivity.createdAt))
            .limit(10);
        } catch (err) {
            console.error("Activity fetch failed for public profile:", err);
            // Non-fatal, just show empty activity
        }

        // Map it to public profile format
        res.json({
            username: displayHandle,
            tier: user.tier || "Initiate",
            reputation: user.reputation || 100,
            accuracy: "N/A", 
            joinedDate: new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            bio: user.bio || "No bio provided.",
            badges: user.tier === "Oracle" ? ["High Predictor", "Early Adopter"] : ["Initiate"],
            recentActivity: recentActivity.map(act => ({
                item: act.itemName || "Market Action",
                action: (act.type || 'action').replace(/_/g, ' ').toLowerCase(),
                time: new Date(act.createdAt || Date.now()).toLocaleDateString()
            }))
        });

    } catch (error) {
        console.error("Error fetching public profile:", error);
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

// GET /api/user/achievements
router.get("/achievements", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userAchievements = await db.select().from(achievements).where(eq(achievements.userId, req.uid!));
        res.json({ achievements: userAchievements });
    } catch (error) {
        console.error("Error fetching achievements:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
