import { Router } from "express";
import { db } from "../db/index.js";
import { categories, items, marketMeta, users, stakes, marketActivity, transactions, adminConfig } from "../db/schema.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { eq, sql, count, desc } from "drizzle-orm";
import { settleBets } from "../engine/settlement.js";
import { sendEmail, templates } from "../lib/email.js";
import { reifyRankings } from "../engine/rankingEngine.js";
import { formatDbConnectError } from "../lib/formatDbError.js";
import { runFullSeed } from "../lib/runFullSeed.js";
import { isSuperAdminEmail } from "../lib/superAdmins.js";

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

        // Mode filter: 'live' (default) | 'demo' | 'all'
        const mode: 'live' | 'demo' | 'all' =
            req.query.mode === 'demo' ? 'demo'
            : req.query.mode === 'all' ? 'all'
            : 'live';

        const stakesWhere = mode === 'demo' ? sql`WHERE is_demo = true`
            : mode === 'live' ? sql`WHERE (is_demo = false OR is_demo IS NULL)`
            : sql``;

        // Platform revenue + referral earnings are real-money only.
        const metaResult = mode === 'demo' ? [{ totalRevenue: 0 }] :
            await db.select({ totalRevenue: sql<number>`SUM(${marketMeta.platformRevenue})` }).from(marketMeta);

        const refResult = mode === 'demo' ? [{ totalReferralPaid: 0 }] :
            await db.select({ totalReferralPaid: sql<number>`SUM(${users.referralEarnings})` }).from(users);

        const balanceResult = mode === 'demo'
            ? await db.select({ totalBalances: sql<number>`SUM(COALESCE(${users.demoBalance}, 0))` }).from(users)
            : await db.select({ totalBalances: sql<number>`SUM(${users.balance})` }).from(users);

        // Category breakdown: live uses marketMeta; demo derives from stakes
        const categoryBreakdown: any = mode === 'demo'
            ? (await db.execute(sql`
                SELECT category_slug AS name, 0 AS revenue, COALESCE(SUM(amount), 0) AS volume
                FROM stakes WHERE is_demo = true GROUP BY category_slug
            `)).rows ?? []
            : await db.select({
                name: marketMeta.categorySlug,
                revenue: marketMeta.platformRevenue,
                volume: marketMeta.totalStaked,
            }).from(marketMeta);

        // Stakes stats filtered by mode
        const stakingStatsRaw: any = (await db.execute(sql`
            SELECT COUNT(*) AS "totalStakes",
                   COALESCE(SUM(amount), 0) AS "totalVolume",
                   COUNT(*) FILTER (WHERE is_settled = false) AS "activeStakes"
            FROM stakes ${stakesWhere}
        `)).rows ?? [];
        const stakingStats = [{
            totalStakes: Number(stakingStatsRaw[0]?.totalStakes || 0),
            totalVolume: Number(stakingStatsRaw[0]?.totalVolume || 0),
            activeStakes: Number(stakingStatsRaw[0]?.activeStakes || 0),
        }];

        // Total user count
        const userCount = await db.select({
            total: sql<number>`COUNT(*)`
        }).from(users);

        res.json({
            mode,
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



// POST /api/admin/ingestor/:type — trigger a one-shot data ingestor (crypto, zeitgeist, etc.)
router.post("/ingestor/:type", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const { type } = req.params;
        let result: any = null;
        if (type === 'crypto' || type === 'coingecko') {
            const { updateCryptoPrices } = await import("../engine/coinGecko.js");
            result = await updateCryptoPrices();
        } else if (type === 'zeitgeist') {
            const { runZeitgeistDiscovery } = await import("../engine/zeitgeist.js");
            result = await runZeitgeistDiscovery();
        } else {
            return res.status(400).json({ error: `Unknown ingestor type: ${type}. Use 'crypto' or 'zeitgeist'.` });
        }
        res.json({ success: true, type, result: result || 'ok' });
    } catch (error: any) {
        console.error("[Admin] Ingestor error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/snapshot/:slug — force a category ranking reification
router.post("/snapshot/:slug", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const { slug } = req.params;
        const { reifyCategoryRankings } = await import("../engine/rankingEngine.js");
        await reifyCategoryRankings(slug);
        res.json({ success: true, slug, message: `Snapshot taken for ${slug}` });
    } catch (error: any) {
        console.error("[Admin] Snapshot error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/freeze-market — freeze/unfreeze a category
router.post("/freeze-market", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const { slug, freeze } = req.body;
        if (!slug || typeof freeze !== 'boolean') {
            return res.status(400).json({ error: "Expecting { slug: string, freeze: boolean }" });
        }
        await db.update(categories).set({ isFrozen: freeze }).where(eq(categories.slug, slug));
        res.json({ success: true, slug, frozen: freeze });
    } catch (error: any) {
        console.error("[Admin] Freeze error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/zmg/status — Zeitgeist Market Generator status overview
router.get("/zmg/status", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const allItems = await db.select({ id: items.id, name: items.name, categorySlug: items.categorySlug, createdAt: items.createdAt, score: items.score, rank: items.rank }).from(items);
        const totalItems = allItems.length;
        const activeMarkets = totalItems;
        const lastItem = allItems.sort((a: any, b: any) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())[0];
        const runs = await db.select().from(marketActivity).where(eq(marketActivity.type, 'zmg_run')).orderBy(desc(marketActivity.createdAt)).limit(20);
        res.json({
            stats: {
                totalItems,
                activeMarkets,
                totalRuns: runs.length,
                successRate: runs.length > 0 ? 100 : 0,
                lastRun: lastItem?.createdAt || null,
            },
            runs,
        });
    } catch (error: any) {
        console.error("[Admin] ZMG status error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/zmg/trigger — trigger ZMG discovery on demand
router.post("/zmg/trigger", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const { runZeitgeistDiscovery } = await import("../engine/zeitgeist.js");
        const result = await runZeitgeistDiscovery();
        res.json({ success: true, result: result || 'queued' });
    } catch (error: any) {
        console.error("[Admin] ZMG trigger error:", error);
        res.status(500).json({ error: error.message });
    }
});


// POST /api/admin/lock-item — Lock a single item from further voting/staking (reversible)
router.post("/lock-item", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const { itemId, lock = true } = req.body;
        if (!itemId) return res.status(400).json({ error: "Expecting { itemId: string }" });
        const newStatus = lock ? "locked" : "active";
        const updated = await db.update(items).set({ status: newStatus }).where(eq(items.docId, itemId)).returning({ docId: items.docId });
        if (updated.length === 0) return res.status(404).json({ error: "Item not found" });
        await db.insert(marketActivity).values({
            type: "admin_action",
            description: `Item ${itemId} ${lock ? "LOCKED" : "unlocked"} by ${req.userEmail}`,
            metadata: { action: "lockItem", itemId, lock },
        });
        res.json({ success: true, itemId, status: newStatus });
    } catch (error: any) {
        console.error("[Admin] lock-item error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/delist-item — Soft-remove an item from rankings (reversible: status flag only)
router.post("/delist-item", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdminEmail(req.userEmail)) return res.status(403).json({ error: "Unauthorized" });
        const { itemId } = req.body;
        if (!itemId) return res.status(400).json({ error: "Expecting { itemId: string }" });
        const updated = await db.update(items).set({ status: "delisted" }).where(eq(items.docId, itemId)).returning({ docId: items.docId });
        if (updated.length === 0) return res.status(404).json({ error: "Item not found" });
        await db.insert(marketActivity).values({
            type: "admin_action",
            description: `Item ${itemId} DELISTED by ${req.userEmail}`,
            metadata: { action: "delistItem", itemId },
        });
        res.json({ success: true, itemId, status: "delisted" });
    } catch (error: any) {
        console.error("[Admin] delist-item error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
