import { Router } from "express";
import { db } from "../db/index";
import { categories, items, epochs, marketMeta, users, stakes, betaInvites } from "../db/schema";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { eq, sql, count } from "drizzle-orm";
import { settleBets } from "../engine/settlement";
import { sendEmail, templates } from "../lib/email";
import { reifyRankings } from "../engine/rankingEngine";
import { CATEGORIES, SEED_ITEMS } from "../data/seedData";

const router = Router();

// Helper to check for Super Admin bypass
const isSuperAdmin = (email: string | undefined) => email === 'peterjohn2343@gmail.com';

// POST /api/admin/seed — Seed database with initial data
router.post("/seed", requireAuth, async (req: AuthRequest, res) => {
    try {
        // Log actor
        console.log(`Admin action: SEED by ${req.userEmail}`);

        // Check permission (must be Oracle OR Super Admin)
        const caller = await db.select().from(users).where(eq(users.firebaseUid, req.uid!)).limit(1);
        if (!isSuperAdmin(req.userEmail) && caller[0]?.tier !== 'Oracle') {
            return res.status(403).json({ error: "Access Denied: Level 4 Clearance Required" });
        }

        let itemCount = 0;

        // Upsert categories
        for (const cat of CATEGORIES) {
            await db.insert(categories).values(cat)
                .onConflictDoUpdate({ target: categories.slug, set: { title: cat.title, description: cat.description } });
        }

        // Upsert items
        for (const [slug, itemList] of Object.entries(SEED_ITEMS)) {
            for (let i = 0; i < itemList.length; i++) {
                const item = itemList[i];
                const docId = `item_${slug}_${i}`;
                const baseScore = Math.floor(Math.random() * 8000) + 2000;

                await db.insert(items).values({
                    docId,
                    name: item.name,
                    symbol: item.symbol,
                    categorySlug: slug,
                    score: baseScore,
                    velocity: parseFloat(((Math.random() * 20) - 10).toFixed(1)),
                    momentum: parseFloat(((Math.random() * 10) - 5).toFixed(2)),
                    volatility: parseFloat((Math.random() * 10 + 1).toFixed(1)),
                    rank: i + 1,
                    totalVotes: Math.floor(Math.random() * 5000) + 500,
                    trend: Array.from({ length: 15 }, () => Math.floor(Math.random() * 100)),
                    status: "active",
                }).onConflictDoUpdate({
                    target: items.docId,
                    set: { name: item.name, symbol: item.symbol },
                });
                itemCount++;
            }
        }

        // Upsert epoch
        const now = new Date();
        const epochDuration = 30 * 60 * 1000;
        await db.insert(epochs).values({
            epochNumber: 1,
            isActive: true,
            startTime: now,
            endTime: new Date(now.getTime() + epochDuration),
            duration: epochDuration,
        }).onConflictDoNothing();

        // Seed re-usable beta invite code
        await db.insert(betaInvites).values({
            code: "BETA2026",
            isReusable: true
        }).onConflictDoNothing();

        // Upsert market meta
        for (const cat of CATEGORIES) {
            await db.insert(marketMeta).values({
                categorySlug: cat.slug,
                totalStaked: 0,
                itemExposure: {},
            }).onConflictDoUpdate({
                target: marketMeta.categorySlug,
                set: { totalStaked: 0 },
            });
        }

        // Ensure calling user exists in users table
        await db.insert(users).values({
            firebaseUid: req.uid!,
            email: req.userEmail || null,
            balance: 0,
            reputation: 100,
            tier: "Oracle",
        }).onConflictDoNothing();

        res.json({ success: true, categories: CATEGORIES.length, items: itemCount });
    } catch (error: any) {
        console.error("Seed error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/settle — Manually trigger stake settlement
router.post("/settle", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!isSuperAdmin(req.userEmail)) {
            const caller = await db.select().from(users).where(eq(users.firebaseUid, req.uid!)).limit(1);
            if (caller[0]?.tier !== 'Oracle') return res.status(403).json({ error: "Unauthorized" });
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
router.post("/reify", requireAuth, async (_req, res) => {
    try {
        await reifyRankings();
        res.json({ success: true, message: "Rankings reified across all categories" });
    } catch (error: any) {
        console.error("Reify error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/stats — System stats
router.get("/stats", requireAuth, async (_req, res) => {
    try {
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
            // ... (keep referral code logic)
            const referredBy = typeof req.query.ref === "string" ? req.query.ref.trim() : null;
            const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

            // Super admin gets Oracle tier by default
            const initialTier = isSuperAdmin(email) ? "Oracle" : "Initiate";
            const initialRep = isSuperAdmin(email) ? 1000 : 100;

            const newUser = await db.insert(users).values({
                firebaseUid: req.uid!,
                email: email || null,
                balance: 0,
                reputation: initialRep,
                tier: initialTier,
                isAdmin: isSuperAdmin(email),
                referralCode,
                referredBy,
            }).returning();
            user = newUser;
        } else {
            // Update existing user if super admin
            if (isSuperAdmin(email) && !user[0].isAdmin) {
                const updated = await db.update(users)
                    .set({ isAdmin: true, tier: 'Oracle' })
                    .where(eq(users.firebaseUid, req.uid!))
                    .returning();
                user = updated;
            }
        }

        // Send welcome email (asynchronous, don't block response)
        if (newUser[0].email) {
            sendEmail(newUser[0].email, templates.welcome(newUser[0].email).subject, templates.welcome(newUser[0].email).html)
                .catch(err => console.error("Welcome email failed:", err));
        }
    }

        res.json(user[0]);
} catch (error: any) {
    res.status(500).json({ error: error.message });
}
});

// POST /api/admin/test-email — Test SMTP configuration
router.post("/test-email", requireAuth, async (req: AuthRequest, res) => {
    try {
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

export default router;
