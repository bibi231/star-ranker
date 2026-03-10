/**
 * Zeitgeist Market Generator - Main Runner
 * 
 * Orchestrates the discovery, scoring, and management of market items.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
    calculateZeitgeistScore,
    calculateDecay,
    normalizeItemName,
    createDedupeKey,
    ZeitgeistSignal
} from "./scorer";
import { fetchWikipediaItems } from "./fetchers/wikipedia";
import { fetchRedditItems } from "./fetchers/reddit";
import { requireOracle, withAudit } from "../admin/middleware";

const db = admin.firestore();

// ============================
// TYPES
// ============================

interface RawItem {
    name: string;
    normalizedName: string;
    dedupeKey: string;
    signals: ZeitgeistSignal[];
}

interface ZMGRunStats {
    itemsDiscovered: number;
    itemsAdded: number;
    itemsUpdated: number;
    itemsArchived: number;
    signalsFetched: number;
    errors: string[];
}

// ============================
// CONFIGURATION
// ============================

const ZMG_CONFIG = {
    defaultTargetItemCount: 150,
    minZeitgeistScore: 20,
    refreshIntervalHours: 12,
    maxItemsPerMarket: 300,
    minSignalsRequired: 2,
    decayCheckIntervalHours: 24
};

// ============================
// MAIN RUNNER
// ============================

/**
 * Scheduled ZMG runner - runs every 12 hours
 */
export const zeitgeistRunner = onSchedule(
    {
        schedule: "every 12 hours",
        timeZone: "UTC",
        timeoutSeconds: 540,
        memory: "1GiB"
    },
    async (event) => {
        console.log("🚀 Starting Zeitgeist Market Generator run...");

        const markets = await db.collection("categories")
            .where("isActive", "==", true)
            .get();

        const platformSettings = await db.collection("settings").doc("platform").get();
        if (platformSettings.exists && platformSettings.data()?.isKilled) {
            console.warn("🛑 ZMG ABORTED: Platform killswitch is ACTIVE.");
            return;
        }

        for (const marketDoc of markets.docs) {
            const marketData = marketDoc.data();
            const market = { id: marketDoc.id, slug: marketData.slug, ...marketData };

            try {
                console.log(`📊 Processing market: ${market.slug}`);
                await runZMGForMarket(market);

                await marketDoc.ref.update({
                    "zmg.lastRefresh": admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`✅ Completed market: ${market.slug}`);
            } catch (error: any) {
                console.error(`❌ ZMG failed for ${market.slug}:`, error);
                await logZMGError(market.id, error.message);
            }
        }

        console.log("🏁 ZMG run completed");
    }
);

/**
 * Manual trigger for ZMG (admin only)
 */
export const triggerZMG = onCall({ cors: true }, async (request) => {
    const ctx = await requireOracle(request);

    const { marketId } = request.data;

    if (!marketId) {
        throw new HttpsError("invalid-argument", "marketId is required");
    }

    const platformSettings = await db.collection("settings").doc("platform").get();
    if (platformSettings.exists && platformSettings.data()?.isKilled) {
        throw new HttpsError("unavailable", "Platform is currently under maintenance or emergency lockdown.");
    }

    const marketDoc = await db.collection("categories").doc(marketId).get();

    if (!marketDoc.exists) {
        throw new HttpsError("not-found", "Market not found");
    }

    const marketData = marketDoc.data();
    const market = { id: marketDoc.id, slug: marketData?.slug, ...marketData };

    return withAudit(ctx, "TRIGGER_ZMG", "market", marketId, async () => {
        const runId = await runZMGForMarket(market);
        return { success: true, runId };
    });
});

/**
 * Runs ZMG for a single market
 */
async function runZMGForMarket(market: any): Promise<string> {
    const runRef = await db.collection("zmg_runs").add({
        marketId: market.id,
        marketSlug: market.slug,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "running",
        stats: {
            itemsDiscovered: 0,
            itemsAdded: 0,
            itemsUpdated: 0,
            itemsArchived: 0,
            signalsFetched: 0,
            errors: []
        }
    });

    const stats: ZMGRunStats = {
        itemsDiscovered: 0,
        itemsAdded: 0,
        itemsUpdated: 0,
        itemsArchived: 0,
        signalsFetched: 0,
        errors: []
    };

    try {
        // Phase 1: Discovery
        console.log(`  → Phase 1: Discovery`);
        const discoveredItems = await discoverItems(market.slug);
        stats.itemsDiscovered = discoveredItems.length;
        stats.signalsFetched = discoveredItems.reduce((sum, i) => sum + i.signals.length, 0);

        // Phase 2: Deduplication
        console.log(`  → Phase 2: Deduplication`);
        const dedupedItems = deduplicateItems(discoveredItems);

        // Phase 3: Scoring
        console.log(`  → Phase 3: Scoring`);
        const scoredItems = await scoreItems(dedupedItems, market.slug);

        // Phase 4: Filtering (spam, low-quality)
        console.log(`  → Phase 4: Filtering`);
        const filteredItems = filterItems(scoredItems, ZMG_CONFIG.minZeitgeistScore);

        // Phase 5: Market Balancing
        console.log(`  → Phase 5: Market Balancing`);
        const balanceStats = await balanceMarket(market.id, market.slug, filteredItems);
        stats.itemsAdded = balanceStats.added;
        stats.itemsUpdated = balanceStats.updated;
        stats.itemsArchived = balanceStats.archived;

        // Phase 6: Decay Application
        console.log(`  → Phase 6: Applying Decay`);
        await applyDecayToMarket(market.id);

        // Update run status
        await runRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            stats
        });

        console.log(`  → Stats: discovered=${stats.itemsDiscovered}, added=${stats.itemsAdded}, updated=${stats.itemsUpdated}, archived=${stats.itemsArchived}`);

    } catch (error: any) {
        stats.errors.push(error.message);
        await runRef.update({
            status: "failed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            stats,
            error: error.message
        });
        throw error;
    }

    return runRef.id;
}

// ============================
// DISCOVERY
// ============================

/**
 * Discovers items from multiple sources
 */
async function discoverItems(marketSlug: string): Promise<RawItem[]> {
    const items: RawItem[] = [];

    // Fetch from Wikipedia (factual data)
    try {
        const wikiItems = await fetchWikipediaItems(marketSlug, 100);
        items.push(...wikiItems.map(i => ({
            name: i.name,
            normalizedName: normalizeItemName(i.name),
            dedupeKey: createDedupeKey(i.name),
            signals: i.signals
        })));
        console.log(`    Wikipedia: ${wikiItems.length} items`);
    } catch (error: any) {
        console.warn(`    Wikipedia fetch failed: ${error.message}`);
    }

    // Fetch from Reddit (social velocity)
    try {
        const redditItems = await fetchRedditItems(marketSlug, 100);
        items.push(...redditItems.map(i => ({
            name: i.name,
            normalizedName: normalizeItemName(i.name),
            dedupeKey: createDedupeKey(i.name),
            signals: i.signals
        })));
        console.log(`    Reddit: ${redditItems.length} items`);
    } catch (error: any) {
        console.warn(`    Reddit fetch failed: ${error.message}`);
    }

    return items;
}

// ============================
// DEDUPLICATION
// ============================

/**
 * Deduplicates items and merges signals
 */
function deduplicateItems(items: RawItem[]): RawItem[] {
    const deduped = new Map<string, RawItem>();

    for (const item of items) {
        if (deduped.has(item.dedupeKey)) {
            // Merge signals
            const existing = deduped.get(item.dedupeKey)!;
            existing.signals.push(...item.signals);
        } else {
            deduped.set(item.dedupeKey, { ...item });
        }
    }

    return Array.from(deduped.values());
}

// ============================
// SCORING
// ============================

/**
 * Scores items using the Zeitgeist algorithm
 */
async function scoreItems(
    items: RawItem[],
    marketSlug: string
): Promise<(RawItem & { zeitgeistScore: any })[]> {
    return items.map(item => ({
        ...item,
        zeitgeistScore: calculateZeitgeistScore(item.signals, marketSlug)
    }));
}

// ============================
// FILTERING
// ============================

/**
 * Filters out low-quality and spam items
 */
function filterItems(
    items: (RawItem & { zeitgeistScore: any })[],
    minScore: number
): (RawItem & { zeitgeistScore: any })[] {
    return items.filter(item => {
        // Minimum score
        if (item.zeitgeistScore.score < minScore) return false;

        // Minimum signals
        if (item.signals.length < ZMG_CONFIG.minSignalsRequired) return false;

        // Minimum confidence
        if (item.zeitgeistScore.confidence < 0.3) return false;

        // Name validation
        if (item.name.length < 2 || item.name.length > 100) return false;

        return true;
    });
}

// ============================
// MARKET BALANCING
// ============================

/**
 * Balances market to target item count
 */
async function balanceMarket(
    marketId: string,
    marketSlug: string,
    newItems: (RawItem & { zeitgeistScore: any })[]
): Promise<{ added: number; updated: number; archived: number }> {
    const stats = { added: 0, updated: 0, archived: 0 };

    // Get current items
    const currentItems = await db.collection("items")
        .where("categoryId", "==", marketSlug)
        .where("status", "==", "active")
        .get();

    const currentDedupeKeys = new Set(
        currentItems.docs.map(d => createDedupeKey(d.data().name))
    );

    // Find items to add (new items not in current)
    const toAdd = newItems.filter(i => !currentDedupeKeys.has(i.dedupeKey));

    // Sort by score and limit
    toAdd.sort((a, b) => b.zeitgeistScore.score - a.zeitgeistScore.score);
    const addLimit = Math.max(0, ZMG_CONFIG.defaultTargetItemCount - currentItems.size);
    const itemsToAdd = toAdd.slice(0, addLimit);

    // Add new items
    const batch = db.batch();

    for (const item of itemsToAdd) {
        const docRef = db.collection("items").doc();
        batch.set(docRef, {
            name: item.name,
            normalizedName: item.normalizedName,
            categoryId: marketSlug,

            // Zeitgeist data
            zeitgeist: item.zeitgeistScore,

            // Ranking data (initial values)
            score: item.zeitgeistScore.score * 10,
            momentum: item.zeitgeistScore.score,
            velocity: item.zeitgeistScore.trendVelocity,
            totalVotes: 0,

            // Decay
            decay: {
                factor: 1.0,
                lastDecay: admin.firestore.FieldValue.serverTimestamp()
            },

            // Status
            status: "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        stats.added++;
    }

    // Update existing items with new signals
    for (const doc of currentItems.docs) {
        const existing = doc.data();
        const dedupeKey = createDedupeKey(existing.name);
        const newData = newItems.find(i => i.dedupeKey === dedupeKey);

        if (newData) {
            batch.update(doc.ref, {
                zeitgeist: newData.zeitgeistScore,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            stats.updated++;
        }
    }

    // Archive low-scoring items if over limit
    if (currentItems.size > ZMG_CONFIG.maxItemsPerMarket) {
        const sorted = currentItems.docs
            .map(d => ({ ref: d.ref, score: d.data().zeitgeist?.score || 0 }))
            .sort((a, b) => a.score - b.score);

        const toArchive = sorted.slice(0, currentItems.size - ZMG_CONFIG.maxItemsPerMarket);

        for (const item of toArchive) {
            batch.update(item.ref, { status: "archived" });
            stats.archived++;
        }
    }

    await batch.commit();

    return stats;
}

// ============================
// DECAY
// ============================

/**
 * Applies decay to all items in a market
 */
async function applyDecayToMarket(marketId: string): Promise<void> {
    const items = await db.collection("items")
        .where("categoryId", "==", marketId)
        .where("status", "==", "active")
        .get();

    const batch = db.batch();

    for (const doc of items.docs) {
        const data = doc.data();
        const lastUpdated = data.zeitgeist?.lastUpdated?.toDate() || new Date();
        const isProtected = data.decay?.protectedUntil?.toDate() > new Date();

        const decayFactor = calculateDecay(lastUpdated, data.totalVotes || 0, isProtected);

        // Only update if decay changed significantly
        if (Math.abs((data.decay?.factor || 1) - decayFactor) > 0.01) {
            batch.update(doc.ref, {
                "decay.factor": decayFactor,
                "decay.lastDecay": admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    await batch.commit();
}

// ============================
// ERROR LOGGING
// ============================

async function logZMGError(marketId: string, error: string): Promise<void> {
    await db.collection("zmg_errors").add({
        marketId,
        error,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
}

// ============================
// ADMIN FUNCTIONS
// ============================

/**
 * Get ZMG run history for a market
 */
export const getZMGRuns = onCall({ cors: true }, async (request) => {
    await requireOracle(request);

    const { marketId, limit = 10 } = request.data;

    let query = db.collection("zmg_runs")
        .orderBy("startedAt", "desc")
        .limit(limit);

    if (marketId) {
        query = query.where("marketId", "==", marketId);
    }

    const runs = await query.get();

    return {
        runs: runs.docs.map(d => ({ id: d.id, ...d.data() }))
    };
});

/**
 * Get ZMG stats across all markets
 */
export const getZMGStats = onCall({ cors: true }, async (request) => {
    await requireOracle(request);

    // Get recent runs
    const recentRuns = await db.collection("zmg_runs")
        .where("status", "==", "completed")
        .orderBy("startedAt", "desc")
        .limit(50)
        .get();

    // Aggregate stats
    const stats = {
        totalRuns: recentRuns.size,
        totalItemsDiscovered: 0,
        totalItemsAdded: 0,
        avgItemsPerRun: 0,
        lastRunTime: null as any
    };

    for (const doc of recentRuns.docs) {
        const data = doc.data();
        stats.totalItemsDiscovered += data.stats?.itemsDiscovered || 0;
        stats.totalItemsAdded += data.stats?.itemsAdded || 0;

        if (!stats.lastRunTime) {
            stats.lastRunTime = data.completedAt;
        }
    }

    stats.avgItemsPerRun = stats.totalRuns > 0
        ? Math.round(stats.totalItemsDiscovered / stats.totalRuns)
        : 0;

    return stats;
});
