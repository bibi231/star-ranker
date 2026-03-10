/**
 * Reddit Fetcher
 * 
 * Fetches social velocity data from Reddit's public API.
 * No API key required for basic access (uses public JSON endpoints).
 */

import { ZeitgeistSignal } from "../scorer";

const REDDIT_API = "https://www.reddit.com";
const USER_AGENT = "StarRanker/1.0 (Zeitgeist Market Generator)";

// Market-specific subreddits
const MARKET_SUBREDDITS: Record<string, string[]> = {
    crypto: [
        "cryptocurrency", "bitcoin", "ethereum", "altcoin",
        "defi", "CryptoMarkets", "solana", "cardano"
    ],
    smartphones: [
        "Android", "iphone", "samsung", "GooglePixel",
        "oneplus", "xiaomi", "smartphones", "MobilePhones"
    ],
    music: [
        "Music", "hiphopheads", "popheads", "indieheads",
        "kpop", "rnb", "electronicmusic", "Metal"
    ],
    websites: [
        "webdev", "technology", "InternetIsBeautiful",
        "startups", "SocialMedia", "apps"
    ],
    tech: [
        "technology", "tech", "gadgets", "Futurology",
        "programming", "apple", "nvidia", "teslamotors"
    ],
    games: [
        "gaming", "Games", "pcgaming", "PS5", "XboxSeriesX",
        "NintendoSwitch", "Esports", "gamedev"
    ],
    movies: [
        "movies", "film", "boxoffice", "MovieDetails",
        "entertainment", "netflix", "television"
    ]
};

interface RedditPost {
    title: string;
    subreddit: string;
    score: number;
    upvoteRatio: number;
    numComments: number;
    created: Date;
    url: string;
    isSelf: boolean;
}

interface ExtractedItem {
    name: string;
    mentions: number;
    totalScore: number;
    totalComments: number;
    avgSentiment: number;
    posts: RedditPost[];
}

/**
 * Fetches social velocity data from Reddit for a specific market
 */
export async function fetchRedditItems(
    marketId: string,
    limit: number = 100
): Promise<{ name: string; signals: ZeitgeistSignal[] }[]> {
    const subreddits = MARKET_SUBREDDITS[marketId] || [];
    const allPosts: RedditPost[] = [];

    // Fetch from all relevant subreddits
    for (const subreddit of subreddits) {
        try {
            const posts = await fetchSubredditPosts(subreddit, 50);
            allPosts.push(...posts);
        } catch (error) {
            console.warn(`Failed to fetch r/${subreddit}:`, error);
        }

        // Rate limiting - Reddit's public API is sensitive
        await sleep(1000);
    }

    // Extract items from posts
    const items = extractItemsFromPosts(allPosts, marketId);

    // Sort by combined score and limit
    const sortedItems = items
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit);

    // Convert to signal format
    return sortedItems.map(item => ({
        name: item.name,
        signals: [
            {
                source: "reddit",
                signalType: "social_velocity",
                value: normalizeSocialScore(item.totalScore, item.mentions),
                confidence: calculateRedditConfidence(item),
                rawData: {
                    mentions: item.mentions,
                    totalScore: item.totalScore,
                    avgComments: item.totalComments / item.mentions
                },
                timestamp: new Date()
            },
            {
                source: "reddit",
                signalType: "engagement",
                value: normalizeEngagement(item.totalComments / item.mentions),
                confidence: 0.7,
                rawData: { avgComments: item.totalComments / item.mentions },
                timestamp: new Date()
            },
            {
                source: "reddit",
                signalType: "sentiment",
                value: item.avgSentiment,
                confidence: 0.6,
                rawData: {},
                timestamp: new Date()
            }
        ]
    }));
}

/**
 * Fetches posts from a subreddit
 */
async function fetchSubredditPosts(
    subreddit: string,
    limit: number
): Promise<RedditPost[]> {
    const urls = [
        `${REDDIT_API}/r/${subreddit}/hot.json?limit=${limit}`,
        `${REDDIT_API}/r/${subreddit}/rising.json?limit=${Math.floor(limit / 2)}`
    ];

    const posts: RedditPost[] = [];

    for (const url of urls) {
        try {
            const response = await fetch(url, {
                headers: { "User-Agent": USER_AGENT }
            });

            if (!response.ok) continue;

            const data = await response.json();

            if (!data.data?.children) continue;

            for (const child of data.data.children) {
                const post = child.data;
                posts.push({
                    title: post.title,
                    subreddit: post.subreddit,
                    score: post.score,
                    upvoteRatio: post.upvote_ratio,
                    numComments: post.num_comments,
                    created: new Date(post.created_utc * 1000),
                    url: post.url,
                    isSelf: post.is_self
                });
            }
        } catch (error) {
            console.warn(`Failed to fetch ${url}:`, error);
        }
    }

    return posts;
}

/**
 * Extracts item names from Reddit posts
 */
function extractItemsFromPosts(
    posts: RedditPost[],
    marketId: string
): ExtractedItem[] {
    const itemMap = new Map<string, ExtractedItem>();

    // Market-specific extraction patterns
    const patterns = getExtractionPatterns(marketId);

    for (const post of posts) {
        // Try to extract item names from title
        const extracted = extractFromText(post.title, patterns);

        for (const name of extracted) {
            const normalizedName = normalizeName(name);

            if (itemMap.has(normalizedName)) {
                const existing = itemMap.get(normalizedName)!;
                existing.mentions++;
                existing.totalScore += post.score;
                existing.totalComments += post.numComments;
                existing.posts.push(post);
                // Update sentiment based on upvote ratio
                existing.avgSentiment =
                    (existing.avgSentiment * (existing.mentions - 1) + post.upvoteRatio * 100) /
                    existing.mentions;
            } else {
                itemMap.set(normalizedName, {
                    name: name,
                    mentions: 1,
                    totalScore: post.score,
                    totalComments: post.numComments,
                    avgSentiment: post.upvoteRatio * 100,
                    posts: [post]
                });
            }
        }
    }

    return Array.from(itemMap.values());
}

/**
 * Gets extraction patterns for a market
 */
function getExtractionPatterns(marketId: string): RegExp[] {
    const commonPatterns: Record<string, RegExp[]> = {
        crypto: [
            /\b(Bitcoin|BTC|Ethereum|ETH|Solana|SOL|Cardano|ADA|XRP|Dogecoin|DOGE)\b/gi,
            /\b([A-Z]{2,5})\b/g, // Ticker symbols
            /\$([A-Z]{2,5})\b/g  // $TICKER format
        ],
        smartphones: [
            /\b(iPhone\s*\d+\s*(?:Pro|Max|Plus)?)\b/gi,
            /\b(Galaxy\s*S\d+\s*(?:Ultra|Plus|\+)?)\b/gi,
            /\b(Pixel\s*\d+\s*(?:Pro|a)?)\b/gi,
            /\b(OnePlus\s*\d+\s*(?:Pro|T)?)\b/gi
        ],
        music: [
            /\b(Taylor Swift|Drake|The Weeknd|Bad Bunny|BTS|Beyoncé|Ed Sheeran)\b/gi,
            // Common artist name patterns
        ],
        tech: [
            /\b(Apple|Google|Microsoft|Amazon|Tesla|NVIDIA|Meta|OpenAI)\b/gi,
            /\b(ChatGPT|Gemini|Claude|GPT-\d)\b/gi
        ],
        games: [
            /\b(GTA|Call of Duty|Fortnite|Minecraft|Elden Ring|Zelda|Pokemon)\b/gi
        ],
        default: []
    };

    return commonPatterns[marketId] || commonPatterns.default;
}

/**
 * Extracts item names from text using patterns
 */
function extractFromText(text: string, patterns: RegExp[]): string[] {
    const extracted: string[] = [];

    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            extracted.push(...matches);
        }
    }

    return [...new Set(extracted)]; // Deduplicate
}

/**
 * Normalizes item name for comparison
 */
function normalizeName(name: string): string {
    return name.toLowerCase().trim();
}

/**
 * Normalizes social score to 0-100
 */
function normalizeSocialScore(totalScore: number, mentions: number): number {
    // Combined metric: score * sqrt(mentions)
    const combined = totalScore * Math.sqrt(mentions);

    // Logarithmic scale for large numbers
    // 100 combined = ~30, 10000 combined = ~60, 1M combined = ~90
    if (combined <= 0) return 0;

    const logScore = Math.log10(combined);
    const normalized = (logScore / 6) * 100; // log10(1M) = 6

    return Math.min(100, Math.max(0, normalized));
}

/**
 * Normalizes engagement (comment count) to 0-100
 */
function normalizeEngagement(avgComments: number): number {
    // 0 comments = 0, 100+ comments = 100
    return Math.min(100, avgComments);
}

/**
 * Calculates confidence in Reddit signals
 */
function calculateRedditConfidence(item: ExtractedItem): number {
    // More mentions = higher confidence
    const mentionFactor = Math.min(1, item.mentions / 10);

    // Recent posts = higher confidence
    const recentPosts = item.posts.filter(p => {
        const hoursSince = (Date.now() - p.created.getTime()) / (1000 * 60 * 60);
        return hoursSince < 24;
    });
    const recencyFactor = recentPosts.length / item.posts.length;

    return (mentionFactor * 0.6 + recencyFactor * 0.4);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
