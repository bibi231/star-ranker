import { db } from "../db/index";
import { items, categories } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Zeitgeist Worker — Discovers and adds trending cultural items.
 * For Beta: Mocks discovery from trending signals.
 * In Prod: Polls Google Trends API, Twitter API, or CoinGecko.
 */
export async function runZeitgeistDiscovery() {
    console.log("[Zeitgeist] Analyzing cultural signals...");

    try {
        // 1. Ensure "Trending" category exists
        const trendingCat = {
            slug: "trending",
            title: "Cultural Zeitgeist",
            description: "Real-time trends discovered by the Oracle discovery engine."
        };

        await db.insert(categories).values(trendingCat)
            .onConflictDoUpdate({ target: categories.slug, set: { title: trendingCat.title } });

        // 2. Mock discovered items (signals)
        const signals = [
            { name: "Mars Colonization", symbol: "MARS", score: 8500 },
            { name: "Artificial General Intelligence", symbol: "AGI", score: 9200 },
            { name: "Quantum Computing", symbol: "QC", score: 7100 },
            { name: "Global Carbon Credit", symbol: "CARBON", score: 6400 }
        ];

        for (const signal of signals) {
            const docId = `zeitgeist_${signal.symbol.toLowerCase()}`;

            await db.insert(items).values({
                docId,
                name: signal.name,
                symbol: signal.symbol,
                categorySlug: "trending",
                score: signal.score,
                velocity: Math.floor(Math.random() * 20) - 10,
                status: "active",
                rank: 99 // Will be reified by RankingEngine
            }).onConflictDoNothing();
        }

        console.log(`[Zeitgeist] Discovery complete. Synchronized ${signals.length} signals.`);
    } catch (error) {
        console.error("[Zeitgeist] Discovery failed:", error);
    }
}

export function startZeitgeistWorker() {
    // Run every 10 minutes in background
    setInterval(runZeitgeistDiscovery, 10 * 60 * 1000);
    // Initial run
    runZeitgeistDiscovery();
}
