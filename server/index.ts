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
import votePacksRouter from "./routes/votePacks.js";
import sponsorshipsRouter from "./routes/sponsorships.js";

import { startRankingEngine } from "./engine/rankingEngine.js";
import { startEpochScheduler } from "./engine/epochScheduler.js";
import { startCryptoFeed } from "./engine/coinGecko.js";
import { startZeitgeistWorker } from "./engine/zeitgeist.js";

import { geoMiddleware } from "./middleware/geo.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow any localhost origin in development
        if (!origin || origin.match(/^https?:\/\/localhost/)) {
            callback(null, true);
        } else {
            callback(null, process.env.CORS_ORIGIN || "http://localhost:5173");
        }
    },
    credentials: true,
}));
app.use(express.json());
app.use(geoMiddleware);

// Rate Limiting
const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, message: { error: "Too many requests" } });
const stakeLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: "Staking rate limit reached" } });
const adminLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: "Admin rate limit reached" } });

app.use(globalLimiter);

// Routes
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
app.use("/api/vote-packs", votePacksRouter);
app.use("/api/sponsorships", sponsorshipsRouter);

if (process.env.SENTRY_DSN && Sentry.Handlers) {
    app.use(Sentry.Handlers.errorHandler());
} else if (process.env.SENTRY_DSN && Sentry.setupExpressErrorHandler) {
    Sentry.setupExpressErrorHandler(app);
}

import { db } from "./db/index.js";

import { categories, items as itemsTable, epochs, marketMeta } from "./db/schema.js";
import { CATEGORIES, SEED_ITEMS } from "./data/seedData.js";

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

// Seed items for a specific category
app.get("/api/seed-items/:slug", async (req, res) => {
    const slug = req.params.slug;
    const itemList = SEED_ITEMS[slug];
    if (!itemList) return res.status(404).json({ error: `Unknown category: ${slug}` });
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

app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n⚡ Star Ranker API running on port ${PORT} (0.0.0.0)\n`);

    // Start background engines
    startEpochScheduler();   // Auto-rolls epochs every 30 min
    startRankingEngine();    // Reifies rankings every 60s
    startCryptoFeed();       // Real crypto prices every 5 min
    startZeitgeistWorker();   // Discover trending markets
});
