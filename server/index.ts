import "dotenv/config";
import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { sql } from "drizzle-orm";

// Routes
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
import usersRouter from "./routes/users.js";
import currencyRouter from "./routes/currency.js";
import publicStatsRouter from "./routes/publicStats.js";
import publicMarketsRouter from "./routes/publicMarkets.js";
import publicWinsRouter from "./routes/publicWins.js";
import publicLeaderboardRouter from "./routes/publicLeaderboard.js";
import portfolioRouter from "./routes/portfolio.js";
import healthRouter from "./routes/health.js";
import searchRouter from "./routes/search.js";

// Engines & Libs
import { startRankingEngine } from "./engine/rankingEngine.js";
import { startEpochScheduler } from "./engine/epochScheduler.js";
import { startCryptoFeed } from "./engine/coinGecko.js";
import { startZeitgeistWorker } from "./engine/zeitgeist.js";
import { geoBlock } from "./middleware/geo.js";
import { formatDbConnectError } from "./lib/formatDbError.js";
import { db, probePostgres, probePostgresWithRetry } from "./db/index.js";
import { bootstrapFreshSchema } from "./db/bootstrapFreshSchema.js";
import { categories, items as itemsTable, epochs, marketMeta } from "./db/schema.js";
import { CATEGORIES, getCuratedSeedItems } from "./data/seedData.js";
import { runFullSeed } from "./lib/runFullSeed.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

// Sentry Initialization
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
    });
}

// Middleware — allow localhost, explicit env list, and common production hosts
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

// Rate Limiting
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, message: { error: "Too many requests" } });
const stakeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: "Staking rate limit reached" } });
const voteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: { error: "Voting rate limit reached" } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { error: "Auth rate limit reached" } });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: "Admin rate limit reached" } });

app.use(globalLimiter);

// Response time audit
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

// Global geo-blocking
app.use(geoBlock);

// Public routes
app.use("/api/health", healthRouter);
app.use("/api/stats/public", publicStatsRouter);
app.use("/api/markets/public-preview", publicMarketsRouter);
app.use("/api/wins/recent-public", publicWinsRouter);
app.use("/api/leaderboard/public", publicLeaderboardRouter);
app.use("/api/search", searchRouter);

// Protected/Feature routes
app.use("/api/user", portfolioRouter);
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

// Error Handling Middlewares
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[CRITICAL] ${req.method} ${req.url}:`, err);
    if (err.query) {
        console.error(`[SQL FAIL] Query: ${err.query}`);
        console.error(`[SQL FAIL] Params: ${JSON.stringify(err.params)}`);
    }
    if (res.headersSent) return next(err);
    res.status(500).json({ 
        error: "Internal Server Error", 
        message: err.message,
        path: req.url 
    });
});

// Sentry Error Handler
if (process.env.SENTRY_DSN) {
    if ((Sentry as any).Handlers?.errorHandler) {
        app.use((Sentry as any).Handlers.errorHandler());
    } else if (Sentry.setupExpressErrorHandler) {
        Sentry.setupExpressErrorHandler(app);
    }
}

// Utility Endpoints
app.get("/api/health/db", async (_req, res) => {
    const r = await probePostgres();
    if (r.ok) return res.json({ status: "ok", db: true, timestamp: Date.now() });
    res.status(503).json({
        status: "error",
        db: false,
        detail: r.detail,
        pgCode: r.pgCode,
        timestamp: Date.now(),
    });
});

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

app.get("/api/seed-database", async (req, res) => {
    const secret = process.env.API_SEED_KEY;
    if (!secret || req.query.key !== secret) {
        return res.status(secret ? 403 : 533).json({ error: secret ? "Invalid key" : "Seed disabled" });
    }
    try {
        const result = await runFullSeed();
        res.json({ success: true, ...result });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

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
        await run("categories table", `CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT, is_frozen BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW())`);
        await run("items table", `CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, doc_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, symbol TEXT, category_slug TEXT NOT NULL, score INTEGER DEFAULT 0, velocity REAL DEFAULT 0, momentum REAL DEFAULT 0, volatility REAL DEFAULT 5, rank INTEGER DEFAULT 1, total_votes INTEGER DEFAULT 0, trend JSONB DEFAULT '[]'::jsonb, image_url TEXT, is_dampened BOOLEAN DEFAULT false, status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT NOW())`);
        
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
        for (const p of itemPatches) await run("item patch", p);

        // Additional schema hardening...
        await run("system_settings table", `CREATE TABLE IF NOT EXISTS system_settings (key VARCHAR(50) PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMP DEFAULT NOW())`);
        await run("system_settings.killswitch", `INSERT INTO system_settings (key, value) VALUES ('killswitch_active', 'false') ON CONFLICT (key) DO NOTHING`);
    } catch (e) {
        console.warn("[schema] patches failed:", e);
    }
}

async function startApi(): Promise<void> {
    const probe = await probePostgresWithRetry(5, 2500);
    const dbReady = probe.ok;

    await bootstrapFreshSchema();
    await ensureSchemaPatches();

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`\n⚡ Star Ranker API running on port ${PORT}\n`);
        if (dbReady) {
            startEpochScheduler();
            startRankingEngine();
            startCryptoFeed();
            startZeitgeistWorker();
        }
    });
}

export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    void startApi().catch((err) => {
        console.error("[startup] Fatal error:", err);
        process.exit(1);
    });
}

process.on('uncaughtException', (err) => console.error('[CRITICAL] Uncaught exception:', err));
process.on('unhandledRejection', (reason) => console.error('[CRITICAL] Unhandled rejection:', reason));
