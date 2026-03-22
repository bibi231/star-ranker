import { Router } from "express";
import { db } from "../db/index";
import { categories, items, marketMeta, users, stakes, marketActivity, transactions, adminConfig } from "../db/schema";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { eq, sql, count, desc } from "drizzle-orm";
import { settleBets } from "../engine/settlement";
import { sendEmail, templates } from "../lib/email";
import { reifyRankings } from "../engine/rankingEngine";
import { formatDbConnectError } from "../lib/formatDbError";
import { runFullSeed } from "../lib/runFullSeed";
import { isSuperAdminEmail } from "../lib/superAdmins";

const router = Router();

// POST /api/admin/killswitch — Toggle global trading killswitch
router.post("/killswitch", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });

        const currentState = await db.select().from(adminConfig).where(eq(adminConfig.key, 'global_state')).limit(1);
        const currentToggle = currentState[0]?.killswitch ?? false;

        await db.update(adminConfig)
            .set({ killswitch: !currentToggle, updatedAt: new Date() })
            .where(eq(adminConfig.key, 'global_state'));

        res.json({ success: true, killswitch: !currentToggle });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/toggle-epochs — Toggle automatic epoch progression
router.post("/toggle-epochs", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const { isPaused } = req.body;

        await db.update(adminConfig)
            .set({ epochsPaused: isPaused, updatedAt: new Date() })
            .where(eq(adminConfig.key, 'global_state'));

        res.json({ success: true, epochsPaused: isPaused });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/seed — Seed database with initial data
router.post("/seed", requireAuth, async (req: AuthRequest, res) => {
    try {
        // Log actor
        console.log(`Admin action: SEED by ${req.userEmail}`);

        if (!isSuperAdminEmail(req.userEmail)) {
            return res.status(403).json({
                error: "Access Denied: full database seed is restricted to super-admin accounts (SUPER_ADMIN_EMAILS).",
            });
        }

        const { categories: catCount, items: itemCount } = await runFullSeed();

        // Ensure calling user exists in users table
        await db.insert(users).values({
            firebaseUid: req.uid!,
            email: req.userEmail || null,
            balance: 0,
            reputation: 100,
            tier: "Oracle",
        }).onConflictDoNothing();

        res.json({ success: true, categories: catCount, items: itemCount });
    } catch (error: unknown) {
        console.error("Seed error:", error);
        res.status(500).json({ error: formatDbConnectError(error) });
    }
});

// POST /api/admin/settle — Manually trigger stake settlement
router.post("/settle", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const result = await settleBets();
        // Also reify rankings after manual settle
        await reifyRankings();
        res.json(result);
    } catch (error: any) {
        console.error("Settle error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/reify — Manually trigger ranking reification
router.post("/reify", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        await reifyRankings();
        res.json({ success: true, message: "Rankings reified across all categories" });
    } catch (error: any) {
        console.error("Reify error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/stats — System stats
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const [userCount] = await db.select({ count: count() }).from(users);
        const [itemCount] = await db.select({ count: count() }).from(items);
        const [categoryCount] = await db.select({ count: count() }).from(categories);
        const [stakeCount] = await db.select({ count: count() }).from(stakes);

        res.json({
            userCount: userCount.count,
            itemCount: itemCount.count,
            categoryCount: categoryCount.count,
            stakeCount: stakeCount.count,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/users/me — Get or create user profile
router.get("/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
        const email = req.userEmail;
        let user = await db.select().from(users).where(eq(users.firebaseUid, req.uid!)).limit(1);

        if (user.length === 0) {
            const referredBy = typeof req.query.ref === "string" ? req.query.ref.trim() : null;
            const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

            // Super admin gets Oracle tier by default
            const initialTier = isSuperAdminEmail(email) ? "Oracle" : "Initiate";
            const initialRep = isSuperAdminEmail(email) ? 1000 : 100;

            const newUser = await db.insert(users).values({
                firebaseUid: req.uid!,
                email: email || null,
                displayName: (req as any).userName || null,
                balance: 0,
                reputation: initialRep,
                tier: initialTier,
                isAdmin: isSuperAdminEmail(email),
                referralCode,
                referredBy,
            }).returning();
            user = newUser;

            // Send welcome email for NEW users (asynchronous)
            if (newUser[0].email) {
                const identity = newUser[0].displayName || newUser[0].email || "Oracle";
                sendEmail(newUser[0].email, templates.welcome(identity).subject, templates.welcome(identity).html)
                    .catch(err => console.error("Welcome email failed:", err));
            }
        } else {
            // Update existing user if super admin
            if (isSuperAdminEmail(email) && !user[0].isAdmin) {
                const updated = await db.update(users)
                    .set({ isAdmin: true, tier: 'Oracle' })
                    .where(eq(users.firebaseUid, req.uid!))
                    .returning();
                user = updated;
            } else {
                // Update display name if it changed but DO NOT touch role/isAdmin
                if ((req as any).userName && user[0].displayName !== (req as any).userName) {
                    const updated = await db.update(users)
                        .set({ displayName: (req as any).userName })
                        .where(eq(users.firebaseUid, req.uid!))
                        .returning();
                    user = updated;
                }
            }
        }

        // Fetch last 10 user activities (safe fetch)
        let recentActivity: any[] = [];
        try {
            recentActivity = await db.select()
                .from(marketActivity)
                .where(eq(marketActivity.userId, req.uid!))
                .orderBy(desc(marketActivity.createdAt))
                .limit(10);
        } catch (e) {
            console.warn("Market activity fetch failed (possibly missing table):", e);
        }
        res.json({
            ...user[0],
            recentActivity
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/test-email — Test SMTP configuration
router.post("/test-email", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const result = await sendEmail(
            req.body.email || "test@example.com",
            "Star Ranker SMTP Test",
            `<div style="background:#020617;color:#f8fafc;padding:40px;font-family:sans-serif;">
                <h1 style="color:#10b981;">✅ SMTP Working</h1>
                <p>If you're reading this, your email configuration is correct.</p>
                <p>Sent at: ${new Date().toISOString()}</p>
            </div>`
        );
        res.json({ success: true, result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// GET /api/admin/revenue — Dashboard revenue metrics
router.get("/revenue", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        // Aggregate platformRevenue from marketMeta
        const metaResult = await db.select({
            totalRevenue: sql<number>`SUM(${marketMeta.platformRevenue})`
        }).from(marketMeta);

        // Aggregate referralEarnings from users
        const refResult = await db.select({
            totalReferralPaid: sql<number>`SUM(${users.referralEarnings})`
        }).from(users);

        // Aggregate total deposits (proxy via user balances)
        const balanceResult = await db.select({
            totalBalances: sql<number>`SUM(${users.balance})`
        }).from(users);

        // Per-category revenue + volume for chart (live data)
        const categoryBreakdown = await db.select({
            name: marketMeta.categorySlug,
            revenue: marketMeta.platformRevenue,
            volume: marketMeta.totalStaked,
        }).from(marketMeta);

        // Total stakes count and total staked amount
        const stakingStats = await db.select({
            totalStakes: sql<number>`COUNT(*)`,
            totalVolume: sql<number>`COALESCE(SUM(${stakes.amount}), 0)`,
            activeStakes: sql<number>`COUNT(*) FILTER (WHERE ${stakes.isSettled} = false)`,
        }).from(stakes);

        // Total user count
        const userCount = await db.select({
            total: sql<number>`COUNT(*)`
        }).from(users);

        res.json({
            platformRevenue: metaResult[0]?.totalRevenue || 0,
            referralEarnings: refResult[0]?.totalReferralPaid || 0,
            totalBalances: balanceResult[0]?.totalBalances || 0,
            totalUsers: userCount[0]?.total || 0,
            stakingStats: {
                totalStakes: stakingStats[0]?.totalStakes || 0,
                totalVolume: stakingStats[0]?.totalVolume || 0,
                activeStakes: stakingStats[0]?.activeStakes || 0,
            },
            categoryBreakdown: categoryBreakdown.map(c => ({
                name: (c.name || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).substring(0, 12),
                revenue: Math.round(c.revenue || 0),
                volume: Math.round(c.volume || 0),
            })),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/ledger-audit — Deep audit of recent financial events
router.get("/ledger-audit", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });

        const recentTransactions = await db.select()
            .from(transactions)
            .orderBy(desc(transactions.createdAt))
            .limit(20);

        const recentActivity = await db.select()
            .from(marketActivity)
            .orderBy(desc(marketActivity.createdAt))
            .limit(20);

        res.json({
            transactions: recentTransactions,
            activity: recentActivity
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/rescue-deposit — Manually credit a missed Paystack transaction
router.post("/rescue-deposit", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });

        const { reference, userId, amountNgn } = req.body;
        if (!reference || !userId || !amountNgn) {
            return res.status(400).json({ error: "Missing reference, userId, or amountNgn" });
        }

        const NGN_USD_RATE = 1500;
        const platformCredits = Math.floor(amountNgn / NGN_USD_RATE * 100) / 100;

        await db.transaction(async (tx) => {
            // Check if already credited
            const existing = await tx.select().from(transactions).where(eq(transactions.reference, reference)).limit(1);
            if (existing.length > 0 && existing[0].status === "completed") {
                throw new Error("Transaction already credited");
            }

            // Update user balance
            await tx.update(users)
                .set({ balance: sql`${users.balance} + ${platformCredits}` })
                .where(eq(users.firebaseUid, userId));

            // Upsert transaction record
            if (existing.length > 0) {
                await tx.update(transactions)
                    .set({ status: "completed", amountNgn, amountUsd: platformCredits, netAmountUsd: platformCredits, settledAt: new Date() })
                    .where(eq(transactions.id, existing[0].id));
            } else {
                await tx.insert(transactions).values({
                    userId, type: "deposit", amountNgn, amountUsd: platformCredits, netAmountUsd: platformCredits,
                    reference, status: "completed", settledAt: new Date()
                });
            }

            // Log activity (safe insert)
            try {
                await tx.insert(marketActivity).values({
                    type: "deposit", userId, amount: platformCredits,
                    description: `Manual Rescue Credit: ${amountNgn} NGN (Ref: ${reference})`,
                });
            } catch (e) {
                console.warn("Could not log rescue activity:", e);
            }
        });

        res.json({ success: true, credited: platformCredits });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
