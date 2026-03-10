/**
 * Wikipedia Fetcher
 * 
 * Fetches factual data from Wikipedia/MediaWiki API.
 * No API key required - uses public API.
 */

import { ZeitgeistSignal } from "../scorer";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const PAGEVIEWS_API = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article";

// Market-specific Wikipedia categories
const MARKET_CATEGORIES: Record<string, string[]> = {
    crypto: ["Cryptocurrencies", "Blockchain", "Decentralized_finance"],
    smartphones: ["Smartphones", "Mobile_phones", "Android_(operating_system)_devices", "IOS_devices"],
    music: ["Musicians", "Singers", "Bands", "Record_producers"],
    websites: ["Websites", "Social_networking_services", "Internet_companies"],
    tech: ["Technology_companies", "Software_companies", "Computer_hardware_companies"],
    games: ["Video_games", "Video_game_franchises", "Esports"],
    movies: ["Films", "Film_directors", "Actors"]
};

interface WikipediaItem {
    title: string;
    pageId: number;
    description?: string;
    pageviews: number;
    lastEdit: Date;
    articleQuality: number;
}

/**
 * Fetches items from Wikipedia for a specific market
 */
export async function fetchWikipediaItems(
    marketId: string,
    limit: number = 100
): Promise<{ name: string; signals: ZeitgeistSignal[] }[]> {
    const categories = MARKET_CATEGORIES[marketId] || [];
    const items: Map<string, WikipediaItem> = new Map();

    for (const category of categories) {
        try {
            const categoryItems = await fetchCategoryMembers(category, Math.ceil(limit / categories.length));

            for (const item of categoryItems) {
                if (!items.has(item.title)) {
                    items.set(item.title, item);
                }
            }
        } catch (error) {
            console.warn(`Failed to fetch category ${category}:`, error);
        }
    }

    // Fetch pageviews for all items
    const itemsWithViews = await enrichWithPageviews(Array.from(items.values()));

    // Convert to signal format
    return itemsWithViews.map(item => ({
        name: item.title,
        signals: [
            {
                source: "wikipedia",
                signalType: "factual",
                value: item.articleQuality,
                confidence: 0.9, // Wikipedia is highly reliable
                rawData: { pageId: item.pageId },
                timestamp: new Date()
            },
            {
                source: "wikipedia",
                signalType: "search_trend",
                value: normalizePageviews(item.pageviews),
                confidence: 0.8,
                rawData: { pageviews: item.pageviews },
                timestamp: new Date()
            }
        ]
    }));
}

/**
 * Fetches members of a Wikipedia category
 */
async function fetchCategoryMembers(
    category: string,
    limit: number
): Promise<WikipediaItem[]> {
    const params = new URLSearchParams({
        action: "query",
        list: "categorymembers",
        cmtitle: `Category:${category}`,
        cmlimit: String(Math.min(limit, 500)),
        cmtype: "page",
        format: "json",
        origin: "*"
    });

    const response = await fetch(`${WIKIPEDIA_API}?${params}`);
    const data = await response.json();

    if (!data.query?.categorymembers) {
        return [];
    }

    return data.query.categorymembers.map((member: any) => ({
        title: member.title,
        pageId: member.pageid,
        pageviews: 0,
        lastEdit: new Date(),
        articleQuality: 50 // Default quality, enhanced later
    }));
}

/**
 * Enriches items with pageview data from Wikimedia API
 */
async function enrichWithPageviews(
    items: WikipediaItem[]
): Promise<WikipediaItem[]> {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDate = formatDate(thirtyDaysAgo);
    const endDate = formatDate(today);

    // Batch process to avoid rate limits
    const batchSize = 10;
    const enrichedItems: WikipediaItem[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const pageviewPromises = batch.map(async (item) => {
            try {
                const encodedTitle = encodeURIComponent(item.title.replace(/ /g, "_"));
                const url = `${PAGEVIEWS_API}/en.wikipedia/all-access/all-agents/${encodedTitle}/daily/${startDate}/${endDate}`;

                const response = await fetch(url);

                if (!response.ok) {
                    return { ...item, pageviews: 0 };
                }

                const data = await response.json();
                const totalViews = data.items?.reduce(
                    (sum: number, day: any) => sum + (day.views || 0),
                    0
                ) || 0;

                // Calculate quality based on pageviews and other factors
                const quality = calculateArticleQuality(totalViews);

                return {
                    ...item,
                    pageviews: totalViews,
                    articleQuality: quality
                };
            } catch (error) {
                return { ...item, pageviews: 0 };
            }
        });

        const results = await Promise.all(pageviewPromises);
        enrichedItems.push(...results);

        // Small delay to avoid rate limiting
        if (i + batchSize < items.length) {
            await sleep(100);
        }
    }

    return enrichedItems;
}

/**
 * Calculates article quality score based on pageviews
 */
function calculateArticleQuality(pageviews: number): number {
    // Logarithmic scale for pageviews
    // 0 views = 0, 1M+ views = 100
    if (pageviews <= 0) return 10;

    const logViews = Math.log10(pageviews);
    // Scale: log10(100) = 2 (low), log10(1M) = 6 (high)
    const normalized = ((logViews - 2) / 4) * 100;

    return Math.max(10, Math.min(100, normalized));
}

/**
 * Normalizes pageviews to 0-100 scale
 */
function normalizePageviews(pageviews: number): number {
    // 0 views = 0, 100K+ views = 100
    if (pageviews <= 0) return 0;

    const normalized = (pageviews / 100000) * 100;
    return Math.min(100, normalized);
}

/**
 * Formats date as YYYYMMDD for Wikimedia API
 */
function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Searches Wikipedia for a specific query
 */
export async function searchWikipedia(
    query: string,
    limit: number = 10
): Promise<{ name: string; signals: ZeitgeistSignal[] }[]> {
    const params = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: String(limit),
        format: "json",
        origin: "*"
    });

    const response = await fetch(`${WIKIPEDIA_API}?${params}`);
    const data = await response.json();

    if (!data.query?.search) {
        return [];
    }

    return data.query.search.map((result: any) => ({
        name: result.title,
        signals: [{
            source: "wikipedia",
            signalType: "factual",
            value: 70, // Search results are relevant by definition
            confidence: 0.7,
            rawData: { pageId: result.pageid, snippet: result.snippet },
            timestamp: new Date()
        }]
    }));
}
