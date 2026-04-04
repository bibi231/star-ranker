import "dotenv/config";
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
    });
}

import express from "express";

import cors from "cors";
import rateLimit from "express-rate-limit";

import categoriesRouter from "./routes/categories.js";
import itemsRouter from "./routes/items.js";
import votesRouter from "./routes/votes.js";
import stakesRouter from "./routes/stakes.js";
import epochsRouter from "./routes/epochs.js";
import adminRouter from "./routes/admin.js";
import leaderboardRouter from "./routes/leaderboard.js";
import paymentsRouter from "./routes/payments.js";
import withdrawalsRouter from "./routes/withdrawals.js";
import authRouter from "./routes/auth.js";
import notificationRouter from "./routes/notifications.js";
import votePacksRouter from "./routes/votePacks.js";
import sponsorshipsRouter from "./routes/sponsorships.js";
import activityRouter from "./routes/activity.js";
import marketIntelligenceRouter from "./routes/marketIntelligence.js";
import watchlistRouter from "./routes/watchlist.js";
import alertsRouter from "./routes/alerts.js";
import commentsRouter from "./routes/comments.js";
import battlesRouter from "./routes/battles.js";
import questsRouter from "./routes/quests.js";
import trialsRouter from "./routes/trials.js";
import seasonsRouter from "./routes/seasons.js";
import systemStatusRouter from "./routes/systemStatus.js";
import demoRouter from "./routes/demo.js";
import syncRouter from "./routes/sync.js";

import { startRankingEngine } from "./engine/rankingEngine.js";
import { startEpochScheduler } from "./engine/epochScheduler.js";
import { startCryptoFeed } from "./engine/coinGecko.js";
import { startZeitgeistWorker } from "./engine/zeitgeist.js";

import { geoBlock } from "./middleware/geo.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

// Middleware — allow localhost, explicit env list, and common production hosts (Vercel / Firebase Hosting)
const extraOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const allowedOrigins = [
    "http://localhost:5173",
    "https://star-ranker-beryl.vercel.app",
    "https://star-ranker.vercel.app",
    "https://star-ranker.web.app",
    "https://starranker.io",
    "https://www.starranker.io",
    process.env.CORS_ORIGIN,
    ...extraOrigins,
].filter(Boolean);

function isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
    if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;
    if (/^https:\/\/[\w-]+\.firebaseapp\.com$/.test(origin)) return true;
    if (/^https:\/\/([\w-]+\.)*starranker\.io$/.test(origin)) return true;
    return false;
}

// Reflect allowed Origin explicitly (required with credentials). Do not callback(Error) on deny —
// that can produce a 500/HTML response with no CORS headers and browsers report it as a CORS failure.
app.use(cors({
    origin(origin, callback) {
        if (!origin || isOriginAllowed(origin)) {
            callback(null, origin || true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
}));
app.use(express.json({
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    }
}));
// Global Error Logging — Stabilizing backend with explicit diagnostics
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[CRITICAL] ${req.method} ${req.url}:`, err);
    
    // Attempt to extract the SQL that failed if it's a DB error
    if (err.query) {
        console.error(`[SQL FAIL] Query: ${err.query}`);
        console.error(`[SQL FAIL] Params: ${JSON.stringify(err.params)}`);
    }

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({ 
        error: "Internal Server Error", 
        message: err.message,
        path: req.url 
    });
});

// Enhanced Debug Logging for 500 Errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[ERROR] ${req.method} ${req.url}:`, err);
    if (res.headersSent) return next(err);
    res.status(500).json({ 
        error: "Internal Server Error", 
        message: err.message, 
        path: req.url 
    });
});

// Rate Limiting — Production Hardening
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, message: { error: "Too many requests" } });
const stakeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: "Staking rate limit reached" } });
const voteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: { error: "Voting rate limit reached" } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { error: "Auth rate limit reached" } });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: "Admin rate limit reached" } });

app.use(globalLimiter);

// Response time audit — log slow endpoints in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const ms = Date.now() - start;
            if (ms > 500) {
                console.warn(`[SLOW] ${req.method} ${req.path} took ${ms}ms`);
            }
        });
        next();
    });
}

// Global geo-blocking (blocks CU, IR, KP, SY, RU from all routes)
app.use(geoBlock);

import usersRouter from "./routes/users.js";
import currencyRouter from "./routes/currency.js";
import publicStatsRouter from "./routes/publicStats.js";
import publicMarketsRouter from "./routes/publicMarkets.js";
import publicWinsRouter from "./routes/publicWins.js";
import publicLeaderboardRouter from "./routes/publicLeaderboard.js";
import portfolioRouter from "./routes/portfolio.js";
import healthRouter from "./routes/health.js";
import searchRouter from "./routes/search.js";

// Public routes (no auth, aggressive caching)
app.use("/api/health", healthRouter);
app.use("/api/stats/public", publicStatsRouter);
app.use("/api/markets/public-preview", publicMarketsRouter);
app.use("/api/wins/recent-public", publicWinsRouter);
app.use("/api/leaderboard/public", publicLeaderboardRouter);
app.use("/api/search", searchRouter);

// Protected routes
app.use("/api/user", portfolioRouter); // /api/user/portfolio


app.use("/api/categories", categoriesRouter);
app.use("/api/items", itemsRouter);
app.use("/api/votes", voteLimiter, votesRouter);
app.use("/api/stakes", stakeLimiter, stakesRouter);
app.use("/api/epochs", epochsRouter);
app.use("/api/admin", adminLimiter, adminRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/withdrawals", withdrawalsRouter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/vote-packs", votePacksRouter);
app.use("/api/sponsorships", sponsorshipsRouter);
app.use("/api/activity", activityRouter);
app.use("/api/markets", marketIntelligenceRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/battles", battlesRouter);
app.use("/api/quests", questsRouter);
app.use("/api/trials", trialsRouter);
app.use("/api/seasons", seasonsRouter);
app.use("/api/system/status", systemStatusRouter);
app.use("/api/demo", demoRouter);
app.use("/api/sync", syncRouter);
app.use("/api/user", usersRouter);
app.use("/api/currency", currencyRouter);
app.use("/api/oracle-trial", trialsRouter);

if (process.env.SENTRY_DSN && (Sentry as any).Handlers) {
    app.use((Sentry as any).Handlers.errorHandler());
} else if (process.env.SENTRY_DSN && Sentry.setupExpressErrorHandler) {
    Sentry.setupExpressErrorHandler(app);
}

import { sql } from "drizzle-orm";

import { formatDbConnectError } from "./lib/formatDbError.js";
import { db, probePostgres, probePostgresWithRetry } from "./db/index.js";
import { bootstrapFreshSchema } from "./db/bootstrapFreshSchema.js";

import { categories, items as itemsTable, epochs, marketMeta } from "./db/schema.js";
import { CATEGORIES, getCuratedSeedItems } from "./data/seedData.js";
import { runFullSeed } from "./lib/runFullSeed.js";

// Health check (no DB — safe for Render keep-alive)
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
});

/** Verifies DATABASE_URL / Neon connectivity (optional diagnostics). */
app.get("/api/health/db", async (_req, res) => {
    const r = await probePostgres();
    if (r.ok) {
        return res.json({ status: "ok", db: true, timestamp: Date.now() });
    }
    res.status(503).json({
        status: "error",
        db: false,
        detail: r.detail,
        pgCode: r.pgCode,
        timestamp: Date.now(),
    });
});

// Seed all categories (quick)
app.get("/api/seed-categories", async (_req, res) => {
    try {
        await bootstrapFreshSchema();
        for (const cat of CATEGORIES) {
            await db.insert(categories).values(cat)
                .onConflictDoUpdate({ target: categories.slug, set: { title: cat.title, description: cat.description } });
        }
        for (const cat of CATEGORIES) {
            await db.insert(marketMeta).values({ categorySlug: cat.slug, totalStaked: 0, platformRevenue: 0, itemExposure: {} })
                .onConflictDoUpdate({ target: marketMeta.categorySlug, set: { totalStaked: 0 } });
        }
        const now = new Date();
        await db.insert(epochs).values({ epochNumber: 1, isActive: true, startTime: now, endTime: new Date(now.getTime() + 1800000), duration: 1800000 }).onConflictDoNothing();
        res.json({ success: true, categories: CATEGORIES.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * One-shot full seed (categories + all items + epoch + market meta).
 * Set API_SEED_KEY on Render, then call: GET /api/seed-database?key=YOUR_KEY
 * Remove or rotate the key after use in production.
 */
app.get("/api/seed-database", async (req, res) => {
    const secret = process.env.API_SEED_KEY;
    if (!secret) {
        return res.status(503).json({
            error: "Full seed is not enabled. Set API_SEED_KEY on the server, or call /api/seed-categories then /api/seed-items/:slug for each category.",
        });
    }
    if (req.query.key !== secret) {
        return res.status(403).json({ error: "Invalid or missing key query parameter" });
    }
    try {
        const result = await runFullSeed();
        res.json({ success: true, ...result });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Seed items for a specific category
app.get("/api/seed-items/:slug", async (req, res) => {
    const slug = req.params.slug;
    const categoryExists = CATEGORIES.some((c) => c.slug === slug);
    const itemList = getCuratedSeedItems(slug);
    if (!categoryExists) return res.status(404).json({ error: `Unknown category: ${slug}` });
    try {
        let count = 0;
        for (let i = 0; i < itemList.length; i++) {
            const item = itemList[i];
            const docId = `item_${slug}_${i}`;
            const baseScore = Math.floor(Math.random() * 8000) + 2000;
            await db.insert(itemsTable).values({
                docId, name: item.name, symbol: item.symbol, categorySlug: slug,
                score: baseScore,
                velocity: parseFloat(((Math.random() * 20) - 10).toFixed(1)),
                momentum: parseFloat(((Math.random() * 10) - 5).toFixed(2)),
                volatility: parseFloat((Math.random() * 10 + 1).toFixed(1)),
                rank: i + 1,
                totalVotes: Math.floor(Math.random() * 5000) + 500,
                trend: Array.from({ length: 15 }, () => Math.floor(Math.random() * 100)),
                status: "active",
            }).onConflictDoUpdate({ target: itemsTable.docId, set: { name: item.name, symbol: item.symbol, score: baseScore } });
            count++;
        }
        res.json({ success: true, category: slug, items: count });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/** Idempotent patches so Drizzle-selected columns exist (e.g. older Neon DBs). */
async function ensureSchemaPatches(): Promise<void> {
    const run = async (label: string, statement: string) => {
        try {
            await db.execute(sql.raw(statement));
            console.log(`[schema] ${label} OK`);
        } catch (e: unknown) {
            console.warn(`[schema] ${label} skipped:`, formatDbConnectError(e));
        }
    };

    try {
        // Core market tables (production DBs created before full schema)
        await run(
            "categories table",
            `CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                slug TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                description TEXT,
                is_frozen BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            )`
        );
        await run("categories.description", `ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT`);
        await run("categories.is_frozen", `ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT false`);
        await run("categories.created_at", `ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);

        await run(
            "items table",
            `CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                doc_id TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                symbol TEXT,
                category_slug TEXT NOT NULL,
                score INTEGER DEFAULT 0,
                velocity REAL DEFAULT 0,
                momentum REAL DEFAULT 0,
                volatility REAL DEFAULT 5,
                rank INTEGER DEFAULT 1,
                total_votes INTEGER DEFAULT 0,
                trend JSONB DEFAULT '[]'::jsonb,
                image_url TEXT,
                is_dampened BOOLEAN DEFAULT false,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW()
            )`
        );

        const itemPatches = [
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS doc_id TEXT",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS name TEXT",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS symbol TEXT",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS category_slug TEXT",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS velocity REAL DEFAULT 0",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS momentum REAL DEFAULT 0",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS volatility REAL DEFAULT 5",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 1",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS trend JSONB DEFAULT '[]'::jsonb",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url TEXT",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS is_dampened BOOLEAN DEFAULT false",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'",
            "ALTER TABLE items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
        ];
        for (let i = 0; i < itemPatches.length; i++) {
            await run(`items patch ${i + 1}`, itemPatches[i]);
        }

        await run(
            "items category index",
            `CREATE INDEX IF NOT EXISTS items_category_idx ON items (category_slug)`
        );

        // Old DBs sometimes stored trend as TEXT — Drizzle expects JSONB
        try {
            await db.execute(sql.raw(`
                DO $$ BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'items'
                        AND column_name = 'trend' AND data_type = 'text'
                    ) THEN
                        ALTER TABLE items ALTER COLUMN trend TYPE JSONB
                        USING COALESCE(NULLIF(trim(trend::text), '')::jsonb, '[]'::jsonb);
                    END IF;
                END $$
            `));
            console.log("[schema] items.trend → JSONB OK");
        } catch {
            /* already jsonb or empty */
        }

        await run("notifications.metadata", `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB`);
        await run("epoch_snapshots.opening_rank", `ALTER TABLE epoch_snapshots ADD COLUMN IF NOT EXISTS opening_rank INTEGER`);
        await run("epoch_snapshots.closing_rank", `ALTER TABLE epoch_snapshots ADD COLUMN IF NOT EXISTS closing_rank INTEGER`);
        await run("epoch_snapshots.rank_change", `ALTER TABLE epoch_snapshots ADD COLUMN IF NOT EXISTS rank_change INTEGER`);

        await run("users.bio", `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
        await run("users.vote_weight", `ALTER TABLE users ADD COLUMN IF NOT EXISTS vote_weight INTEGER DEFAULT 1`);
        await run("users.max_stake_per_epoch", `ALTER TABLE users ADD COLUMN IF NOT EXISTS max_stake_per_epoch INTEGER DEFAULT 5000`);

        // System settings table for killswitch + feature flags
        await run("system_settings table", `
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Ensure killswitch row exists
        await run("system_settings.killswitch", `
            INSERT INTO system_settings (key, value) VALUES ('killswitch_active', 'false')
            ON CONFLICT (key) DO NOTHING
        `);

        // Add missing indexes for performance at scale
        await run("stakes_item_idx", `CREATE INDEX IF NOT EXISTS stakes_item_idx ON stakes (item_doc_id)`);
        await run("stakes_settled_idx", `CREATE INDEX IF NOT EXISTS stakes_settled_idx ON stakes (is_settled)`);
        await run("market_activity_type_time_idx", `CREATE INDEX IF NOT EXISTS market_activity_type_time_idx ON market_activity (type, created_at)`);


        // feature: social layer
        await run("market_comments table", `
            CREATE TABLE IF NOT EXISTS market_comments (
                id SERIAL PRIMARY KEY,
                item_id INTEGER NOT NULL REFERENCES items(id),
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                parent_id INTEGER,
                likes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        await run("oracle_battles table", `
            CREATE TABLE IF NOT EXISTS oracle_battles (
                id SERIAL PRIMARY KEY,
                creator_id TEXT,
                title VARCHAR(100) NOT NULL,
                item_a_id INTEGER REFERENCES items(id),
                item_b_id INTEGER REFERENCES items(id),
                category_id INTEGER REFERENCES categories(id),
                question VARCHAR(200) NOT NULL,
                ends_at TIMESTAMP NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                total_votes_a INTEGER DEFAULT 0,
                total_votes_b INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await run("daily_quests table", `
            CREATE TABLE IF NOT EXISTS daily_quests (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                quest_date DATE NOT NULL,
                voted_today BOOLEAN DEFAULT false,
                staked_today BOOLEAN DEFAULT false,
                commented_today BOOLEAN DEFAULT false,
                checked_in_today BOOLEAN DEFAULT false,
                claimed BOOLEAN DEFAULT false,
                xp_earned INTEGER DEFAULT 0,
                UNIQUE(user_id, quest_date)
            )
        `);

        await run("oracle_trials table", `
            CREATE TABLE IF NOT EXISTS oracle_trials (
                id SERIAL PRIMARY KEY,
                trial_date DATE NOT NULL UNIQUE,
                item_ids JSONB NOT NULL,
                category_id INTEGER REFERENCES categories(id)
            )
        `);

        await run("trial_attempts table", `
            CREATE TABLE IF NOT EXISTS trial_attempts (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                trial_id INTEGER REFERENCES oracle_trials(id),
                guess_order JSONB NOT NULL,
                score INTEGER NOT NULL,
                completed_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, trial_id)
            )
        `);

        await run("seasons table", `
            CREATE TABLE IF NOT EXISTS seasons (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'active'
            )
        `);

        await run("season_leaderboard table", `
            CREATE TABLE IF NOT EXISTS season_leaderboard (
                id SERIAL PRIMARY KEY,
                season_id INTEGER REFERENCES seasons(id),
                user_id TEXT NOT NULL,
                season_xp INTEGER DEFAULT 0,
                season_rank INTEGER,
                tier VARCHAR(20) DEFAULT 'apprentice',
                UNIQUE(user_id, season_id)
            )
        `);

    } catch (e) {
        console.warn("[schema] ensureSchemaPatches outer error:", e);
    }
}

function isProductionDeploy(): boolean {
    return process.env.NODE_ENV === "production" || process.env.RENDER === "true";
}

async function startApi(): Promise<void> {
    const allowNoDb = process.env.ALLOW_START_WITHOUT_DB === "1";

    if (!process.env.DATABASE_URL?.trim()) {
        console.error(
            "[DB] DATABASE_URL is missing. Set it in Render → Environment to your Neon connection string (postgresql://…)."
        );
        if (isProductionDeploy() && !allowNoDb) {
            process.exit(1);
        }
    }

    const probe = await probePostgresWithRetry(5, 2500);
    if (!probe.ok) {
        console.error("[DB] Cannot connect to Postgres after retries:", probe.detail);
        if (isProductionDeploy() && !allowNoDb) {
            process.exit(1);
        }
    }

    const dbReady = probe.ok;

    await bootstrapFreshSchema();
    await ensureSchemaPatches();

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`\n⚡ Star Ranker API running on port ${PORT} (0.0.0.0)\n`);

        // Background engines need Postgres
        if (dbReady) {
            startEpochScheduler();   // Auto-rolls epochs every 30 min
            startRankingEngine();    // Reifies rankings every 60s
            startCryptoFeed();       // Real crypto prices every 5 min
            startZeitgeistWorker();  // Discover trending markets
        }

        const RENDER_URL = process.env.RENDER_URL;
        if (RENDER_URL) {
            const PING_INTERVAL_MS = 14 * 60 * 1000;
            setInterval(async () => {
                try {
                    const res = await fetch(`${RENDER_URL}/api/health`);
                    if (res.ok) console.log(`[keep-alive] pinged ${RENDER_URL}/api/health ✓`);
                } catch (err) {
                    console.warn(`[keep-alive] ping failed:`, err);
                }
            }, PING_INTERVAL_MS);
        }
    });
}

// Export for Vercel Serverless
export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    void startApi().catch((err) => {
        console.error("[startup] Fatal error:", err);
        process.exit(1);
    });
}

// Protect the server from terminating unconditionally
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception intercepted:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection intercepted at:', promise, 'reason:', reason);
});
