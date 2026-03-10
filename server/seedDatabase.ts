import "dotenv/config";
import { db } from "./db/index";
import { categories, items, epochs, marketMeta } from "./db/schema";

async function seed() {
    console.log("🌱 Starting direct database seed...");

    try {
        const SEED_DATA: Record<string, Array<{ name: string; symbol: string }>> = {
            crypto: [
                { name: "Bitcoin (BTC)", symbol: "BTC" }, { name: "Ethereum (ETH)", symbol: "ETH" },
                { name: "Solana (SOL)", symbol: "SOL" }, { name: "Ripple (XRP)", symbol: "XRP" },
                { name: "Cardano (ADA)", symbol: "ADA" }, { name: "Avalanche (AVAX)", symbol: "AVAX" },
                { name: "Dogecoin (DOGE)", symbol: "DOGE" }, { name: "Polkadot (DOT)", symbol: "DOT" },
                { name: "Chainlink (LINK)", symbol: "LINK" }, { name: "Polygon (MATIC)", symbol: "MATIC" },
                { name: "Shiba Inu (SHIB)", symbol: "SHIB" }, { name: "Litecoin (LTC)", symbol: "LTC" },
                { name: "Cosmos (ATOM)", symbol: "ATOM" }, { name: "Uniswap (UNI)", symbol: "UNI" },
                { name: "Stellar (XLM)", symbol: "XLM" },
            ],
            smartphones: [
                { name: "iPhone 15 Pro Max", symbol: "AAPL" }, { name: "Samsung Galaxy S24 Ultra", symbol: "SAMSUNG" },
                { name: "Google Pixel 8 Pro", symbol: "GOOGL" }, { name: "OnePlus 12", symbol: "ONEPLUS" },
                { name: "Xiaomi 14 Ultra", symbol: "XIAOMI" }, { name: "iPhone 15", symbol: "AAPL" },
                { name: "Samsung Galaxy Z Fold 5", symbol: "SAMSUNG" }, { name: "Sony Xperia 1 V", symbol: "SONY" },
                { name: "Asus ROG Phone 8", symbol: "ASUS" }, { name: "Nothing Phone (2)", symbol: "NOTHING" },
                { name: "Huawei Pura 70", symbol: "HUAWEI" }, { name: "Honor Magic 6 Pro", symbol: "HONOR" },
            ],
            music: [
                { name: "Michael Jackson", symbol: "MJ" }, { name: "The Beatles", symbol: "BEATLES" },
                { name: "Queen", symbol: "QUEEN" }, { name: "Madonna", symbol: "MADONNA" },
                { name: "Elvis Presley", symbol: "ELVIS" }, { name: "Led Zeppelin", symbol: "ZEP" },
                { name: "Pink Floyd", symbol: "FLOYD" }, { name: "Eminem", symbol: "EMINEM" },
                { name: "Taylor Swift", symbol: "TSWIFT" }, { name: "Beyoncé", symbol: "BEY" },
                { name: "Bob Dylan", symbol: "DYLAN" }, { name: "Drake", symbol: "DRAKE" },
            ],
            websites: [
                { name: "Google", symbol: "GOOG" }, { name: "YouTube", symbol: "YT" },
                { name: "Facebook", symbol: "FB" }, { name: "Amazon", symbol: "AMZN" },
                { name: "Wikipedia", symbol: "WIKI" }, { name: "Twitter / X", symbol: "X" },
                { name: "Instagram", symbol: "INSTA" }, { name: "Reddit", symbol: "REDDIT" },
                { name: "Netflix", symbol: "NFLX" }, { name: "LinkedIn", symbol: "LINKD" },
                { name: "OpenAI", symbol: "AI" }, { name: "Twitch", symbol: "TWITCH" },
            ],
            tech: [
                { name: "Apple", symbol: "AAPL" }, { name: "Microsoft", symbol: "MSFT" },
                { name: "NVIDIA", symbol: "NVDA" }, { name: "Alphabet (Google)", symbol: "GOOGL" },
                { name: "Amazon", symbol: "AMZN" }, { name: "Meta", symbol: "META" },
                { name: "Tesla", symbol: "TSLA" }, { name: "TSMC", symbol: "TSM" },
                { name: "Tencent", symbol: "TCEHY" }, { name: "Samsung", symbol: "SSNLF" },
                { name: "Oracle", symbol: "ORCL" }, { name: "AMD", symbol: "AMD" },
            ],
        };

        const CATS = [
            { slug: "crypto", title: "Crypto Assets", description: "Top cryptocurrencies by market cap and sentiment." },
            { slug: "smartphones", title: "Smartphones", description: "Latest flagship devices and mobile tech." },
            { slug: "music", title: "Music Legends", description: "Greatest artists and albums of all time." },
            { slug: "websites", title: "Websites", description: "Most influential domains and web services." },
            { slug: "tech", title: "Tech Giants", description: "Leading technology companies and innovators." },
        ];

        console.log("- Upserting categories...");
        for (const cat of CATS) {
            await db.insert(categories).values(cat)
                .onConflictDoUpdate({ target: categories.slug, set: { title: cat.title, description: cat.description } });
        }

        console.log("- Upserting items...");
        let itemCount = 0;
        for (const [slug, itemList] of Object.entries(SEED_DATA)) {
            for (let i = 0; i < itemList.length; i++) {
                const item = itemList[i];
                const docId = `item_${slug}_${i}`;
                const baseScore = Math.floor(Math.random() * 8000) + 2000;

                await db.insert(items).values({
                    docId,
                    name: item.name,
                    symbol: item.symbol,
                    categorySlug: slug,
                    score: baseScore,
                    velocity: parseFloat(((Math.random() * 20) - 10).toFixed(1)),
                    momentum: parseFloat(((Math.random() * 10) - 5).toFixed(2)),
                    volatility: parseFloat((Math.random() * 10 + 1).toFixed(1)),
                    rank: i + 1,
                    totalVotes: Math.floor(Math.random() * 5000) + 500,
                    trend: Array.from({ length: 15 }, () => Math.floor(Math.random() * 100)),
                    status: "active",
                }).onConflictDoUpdate({
                    target: items.docId,
                    set: { name: item.name, symbol: item.symbol },
                });
                itemCount++;
            }
        }

        console.log("- Creating initial epoch...");
        const now = new Date();
        const epochDuration = 30 * 60 * 1000;
        await db.insert(epochs).values({
            epochNumber: 1,
            isActive: true,
            startTime: now,
            endTime: new Date(now.getTime() + epochDuration),
            duration: epochDuration,
        }).onConflictDoNothing();

        console.log("- Creating market meta records...");
        for (const cat of CATS) {
            await db.insert(marketMeta).values({
                categorySlug: cat.slug,
                totalStaked: 0,
                itemExposure: {},
            }).onConflictDoUpdate({
                target: marketMeta.categorySlug,
                set: { totalStaked: 0 },
            });
        }

        console.log(`✅ Success! Seeded ${CATS.length} categories and ${itemCount} items.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed error:", error);
        process.exit(1);
    }
}

seed();
