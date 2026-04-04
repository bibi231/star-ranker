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

        // Use /coins/markets which returns image URLs alongside price data
        const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`;

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.status === 429) {
            console.warn("[CoinGecko] Rate limited (429). Skipping update.");
            return;
        }
        if (!response.ok) {
            console.warn(`[CoinGecko] API returned ${response.status}`);
            return;
        }

        const coinsList: any[] = await response.json();
        console.log(`[CoinGecko] Fetched data for ${coinsList.length} coins`);

        // Build lookup by geckoId
        const coinData: Record<string, { price: number; change24h: number; marketCap: number; image: string }> = {};
        for (const coin of coinsList) {
            coinData[coin.id] = {
                price: coin.current_price || 0,
                change24h: coin.price_change_percentage_24h || 0,
                marketCap: coin.market_cap || 0,
                image: coin.image || "",
            };
        }

        // Get all crypto items
        const cryptoItems = await db
            .select()
            .from(items)
            .where(eq(items.categorySlug, "crypto"));

        for (const item of cryptoItems) {
            const geckoId = SYMBOL_TO_COINGECKO[item.symbol ?? ""];
            if (!geckoId || !coinData[geckoId]) continue;

            const coin = coinData[geckoId];
            const marketCapScore = coin.marketCap > 0 ? Math.floor(Math.log10(coin.marketCap) * 1000) : 0;
            const newVelocity = parseFloat(coin.change24h.toFixed(2));
            const newVolatility = parseFloat(Math.abs(coin.change24h * 0.5).toFixed(2));
            const blendedScore = Math.floor((item.score ?? 0) * 0.3 + marketCapScore * 0.7);

            const updateFields: any = {
                score: blendedScore,
                velocity: newVelocity,
                volatility: Math.max(1, newVolatility),
                trend: [
                    ...((item.trend as number[] || []).slice(-14)),
                    Math.floor(coin.price)
                ],
            };

            // Populate imageUrl if missing
            if (!item.imageUrl && coin.image) {
                updateFields.imageUrl = coin.image;
            }

            await db.update(items).set(updateFields).where(eq(items.id, item.id));
        }

        console.log(`[CoinGecko] Updated ${cryptoItems.length} crypto items with real prices + images`);
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
