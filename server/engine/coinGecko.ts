/**
 * CoinGecko Integration — Fetches real crypto prices and updates item scores.
 * Free API, no key required (rate limited to ~30 calls/min).
 * 
 * Updates the "crypto" category items with real market data.
 */

import { db } from "../db/index";
import { items } from "../db/schema";
import { eq, and } from "drizzle-orm";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const UPDATE_INTERVAL = 5 * 60 * 1000; // Every 5 minutes

// Map our symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    XRP: "ripple",
    ADA: "cardano",
    AVAX: "avalanche-2",
    DOGE: "dogecoin",
    DOT: "polkadot",
    LINK: "chainlink",
    MATIC: "matic-network",
    SHIB: "shiba-inu",
    LTC: "litecoin",
    ATOM: "cosmos",
    UNI: "uniswap",
    XLM: "stellar",
};

interface CoinGeckoPrice {
    usd: number;
    usd_24h_change: number;
    usd_24h_vol: number;
    usd_market_cap: number;
}

export async function updateCryptoPrices() {
    try {
        const ids = Object.values(SYMBOL_TO_COINGECKO).join(",");
        const url = `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

        const response = await fetch(url);
        if (response.status === 429) {
            console.warn("[CoinGecko] Rate limited (429). Backing off for 60s.");
            return; // Will naturally retry on next interval
        }
        if (!response.ok) {
            console.warn(`[CoinGecko] API returned ${response.status}`);
            return;
        }

        const data: Record<string, CoinGeckoPrice> = await response.json();
        console.log(`[CoinGecko] Fetched prices for ${Object.keys(data).length} coins`);

        // Get all crypto items
        const cryptoItems = await db
            .select()
            .from(items)
            .where(eq(items.categorySlug, "crypto"));

        for (const item of cryptoItems) {
            const geckoId = SYMBOL_TO_COINGECKO[item.symbol ?? ""];
            if (!geckoId || !data[geckoId]) continue;

            const priceData = data[geckoId];
            const priceUsd = priceData.usd;
            const change24h = priceData.usd_24h_change || 0;
            const marketCap = priceData.usd_market_cap || 0;

            // Score = market cap rank influence + vote-based score
            // We use log of market cap as a base score component
            const marketCapScore = marketCap > 0 ? Math.floor(Math.log10(marketCap) * 1000) : 0;
            const newVelocity = parseFloat(change24h.toFixed(2));
            const newVolatility = parseFloat(Math.abs(change24h * 0.5).toFixed(2));

            // Update item with real market data — blend with existing vote-based score
            const blendedScore = Math.floor((item.score ?? 0) * 0.3 + marketCapScore * 0.7);

            await db.update(items).set({
                score: blendedScore,
                velocity: newVelocity,
                volatility: Math.max(1, newVolatility),
                // Store a trend data point
                trend: [
                    ...((item.trend as number[] || []).slice(-14)),
                    Math.floor(priceUsd)
                ],
            }).where(eq(items.id, item.id));
        }

        console.log(`[CoinGecko] Updated ${cryptoItems.length} crypto items with real prices`);
    } catch (error) {
        console.error("[CoinGecko] Price update failed:", error);
    }
}

export function startCryptoFeed() {
    console.log(`📈 CoinGecko feed started (every ${UPDATE_INTERVAL / 60000} min)`);

    // First update after 10 seconds (give DB time to seed)
    setTimeout(() => updateCryptoPrices().catch(console.error), 10000);

    // Then every 5 minutes
    setInterval(() => {
        updateCryptoPrices().catch(console.error);
    }, UPDATE_INTERVAL);
}
