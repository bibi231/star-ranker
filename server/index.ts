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

import categoriesRouter from "./routes/categories";
import itemsRouter from "./routes/items";
import votesRouter from "./routes/votes";
import stakesRouter from "./routes/stakes";
import epochsRouter from "./routes/epochs";
import adminRouter from "./routes/admin";
import leaderboardRouter from "./routes/leaderboard";
import paymentsRouter from "./routes/payments";
import withdrawalsRouter from "./routes/withdrawals";
import authRouter from "./routes/auth";
import notificationRouter from "./routes/notifications";
import votePacksRouter from "./routes/votePacks";
import sponsorshipsRouter from "./routes/sponsorships";
import activityRouter from "./routes/activity";
import marketIntelligenceRouter from "./routes/marketIntelligence";

import { startRankingEngine } from "./engine/rankingEngine";
import { startEpochScheduler } from "./engine/epochScheduler";
import { startCryptoFeed } from "./engine/coinGecko";
import { startZeitgeistWorker } from "./engine/zeitgeist";

import { geoMiddleware } from "./middleware/geo";

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
app.use(geoMiddleware);

// Rate Limiting — Drastically relaxed for beta testing
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10000, message: { error: "Too many requests" } });
const stakeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5000, message: { error: "Staking rate limit reached" } });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5000, message: { error: "Admin rate limit reached" } });

app.use(globalLimiter);

import usersRouter from "./routes/users";
import currencyRouter from "./routes/currency";

app.use("/api/categories", categoriesRouter);
app.use("/api/items", itemsRouter);
app.use("/api/votes", votesRouter);
app.use("/api/stakes", stakeLimiter, stakesRouter);
app.use("/api/epochs", epochsRouter);
app.use("/api/admin", adminLimiter, adminRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/withdrawals", withdrawalsRouter);
app.use("/api/auth", authRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/vote-packs", votePacksRouter);
app.use("/api/sponsorships", sponsorshipsRouter);
app.use("/api/activity", activityRouter);
app.use("/api/markets", marketIntelligenceRouter);
app.use("/api/user", usersRouter);
app.use("/api/currency", currencyRouter);

if (process.env.SENTRY_DSN && (Sentry as any).Handlers) {
    app.use((Sentry as any).Handlers.errorHandler());
} else if (process.env.SENTRY_DSN && Sentry.setupExpressErrorHandler) {
    Sentry.setupExpressErrorHandler(app);
}

import { sql } from "drizzle-orm";

import { db } from "./db/index";

import { categories, items as itemsTable, epochs, marketMeta } from "./db/schema";
import { CATEGORIES, getCuratedSeedItems } from "./data/seedData";
import { runFullSeed } from "./lib/runFullSeed";

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
});

// Seed all categories (quick)
app.get("/api/seed-categories", async (_req, res) => {
    try {
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
        } catch (e: any) {
            console.warn(`[schema] ${label} skipped:`, e?.message || e);
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
    } catch (e) {
        console.warn("[schema] ensureSchemaPatches outer error:", e);
    }
}

void ensureSchemaPatches().then(() => {
app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n⚡ Star Ranker API running on port ${PORT} (0.0.0.0)\n`);

    // Start background engines
    startEpochScheduler();   // Auto-rolls epochs every 30 min
    startRankingEngine();    // Reifies rankings every 60s
    startCryptoFeed();       // Real crypto prices every 5 min
    startZeitgeistWorker();  // Discover trending markets

    // ── Render.com keep-alive (prevents free-tier cold starts) ──────────────
    // Render spins down after 15 min of inactivity. This self-ping every
    // 14 min keeps the server warm. Only runs in production when RENDER_URL is set.
    // Example: RENDER_URL=https://star-ranker-api.onrender.com
    const RENDER_URL = process.env.RENDER_URL;
    if (RENDER_URL) {
        const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes
        setInterval(async () => {
            try {
                const res = await fetch(`${RENDER_URL}/api/health`);
                if (res.ok) {
                    console.log(`[keep-alive] pinged ${RENDER_URL}/api/health ✓`);
                }
            } catch (err) {
                console.warn(`[keep-alive] ping failed:`, err);
            }
        }, PING_INTERVAL_MS);
        console.log(`[keep-alive] Self-ping active every 14 min → ${RENDER_URL}/api/health`);
    }
});
});
