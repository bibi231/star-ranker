/**
 * Seed Firestore with initial data for Star Ranker.
 * 
 * Run with: node scripts/seedFirestore.js
 * 
 * Populates: categories, items, epochs, market_meta, settings/platform
 */

import admin from "firebase-admin";

admin.initializeApp({
    projectId: "star-ranker",
});

const db = admin.firestore();

const MOCK_DATA = {
    crypto: [
        { name: "Bitcoin (BTC)", symbol: "BTC" },
        { name: "Ethereum (ETH)", symbol: "ETH" },
        { name: "Solana (SOL)", symbol: "SOL" },
        { name: "Ripple (XRP)", symbol: "XRP" },
        { name: "Cardano (ADA)", symbol: "ADA" },
        { name: "Avalanche (AVAX)", symbol: "AVAX" },
        { name: "Dogecoin (DOGE)", symbol: "DOGE" },
        { name: "Polkadot (DOT)", symbol: "DOT" },
        { name: "Chainlink (LINK)", symbol: "LINK" },
        { name: "Polygon (MATIC)", symbol: "MATIC" },
        { name: "Shiba Inu (SHIB)", symbol: "SHIB" },
        { name: "Litecoin (LTC)", symbol: "LTC" },
        { name: "Cosmos (ATOM)", symbol: "ATOM" },
        { name: "Uniswap (UNI)", symbol: "UNI" },
        { name: "Stellar (XLM)", symbol: "XLM" }
    ],
    smartphones: [
        { name: "iPhone 15 Pro Max", symbol: "AAPL" },
        { name: "Samsung Galaxy S24 Ultra", symbol: "SAMSUNG" },
        { name: "Google Pixel 8 Pro", symbol: "GOOGL" },
        { name: "OnePlus 12", symbol: "ONEPLUS" },
        { name: "Xiaomi 14 Ultra", symbol: "XIAOMI" },
        { name: "iPhone 15", symbol: "AAPL" },
        { name: "Samsung Galaxy Z Fold 5", symbol: "SAMSUNG" },
        { name: "Sony Xperia 1 V", symbol: "SONY" },
        { name: "Asus ROG Phone 8", symbol: "ASUS" },
        { name: "Nothing Phone (2)", symbol: "NOTHING" },
        { name: "Huawei Pura 70", symbol: "HUAWEI" },
        { name: "Honor Magic 6 Pro", symbol: "HONOR" }
    ],
    music: [
        { name: "Michael Jackson", symbol: "MJ" },
        { name: "The Beatles", symbol: "BEATLES" },
        { name: "Queen", symbol: "QUEEN" },
        { name: "Madonna", symbol: "MADONNA" },
        { name: "Elvis Presley", symbol: "ELVIS" },
        { name: "Led Zeppelin", symbol: "ZEP" },
        { name: "Pink Floyd", symbol: "FLOYD" },
        { name: "Eminem", symbol: "EMINEM" },
        { name: "Taylor Swift", symbol: "TSWIFT" },
        { name: "Beyoncé", symbol: "BEY" },
        { name: "Bob Dylan", symbol: "DYLAN" },
        { name: "Drake", symbol: "DRAKE" }
    ],
    websites: [
        { name: "Google", symbol: "GOOG" },
        { name: "YouTube", symbol: "YT" },
        { name: "Facebook", symbol: "FB" },
        { name: "Amazon", symbol: "AMZN" },
        { name: "Wikipedia", symbol: "WIKI" },
        { name: "Twitter / X", symbol: "X" },
        { name: "Instagram", symbol: "INSTA" },
        { name: "Reddit", symbol: "REDDIT" },
        { name: "Netflix", symbol: "NFLX" },
        { name: "LinkedIn", symbol: "LINKD" },
        { name: "OpenAI", symbol: "AI" },
        { name: "Twitch", symbol: "TWITCH" }
    ],
    tech: [
        { name: "Apple", symbol: "AAPL" },
        { name: "Microsoft", symbol: "MSFT" },
        { name: "NVIDIA", symbol: "NVDA" },
        { name: "Alphabet (Google)", symbol: "GOOGL" },
        { name: "Amazon", symbol: "AMZN" },
        { name: "Meta", symbol: "META" },
        { name: "Tesla", symbol: "TSLA" },
        { name: "TSMC", symbol: "TSM" },
        { name: "Tencent", symbol: "TCEHY" },
        { name: "Samsung", symbol: "SSNLF" },
        { name: "Oracle", symbol: "ORCL" },
        { name: "AMD", symbol: "AMD" }
    ]
};

const CATEGORIES = [
    { slug: "crypto", title: "Crypto Assets", description: "Top cryptocurrencies by market cap and sentiment." },
    { slug: "smartphones", title: "Smartphones", description: "Latest flagship devices and mobile tech." },
    { slug: "music", title: "Music Legends", description: "Greatest artists and albums of all time." },
    { slug: "websites", title: "Websites", description: "Most influential domains and web services." },
    { slug: "tech", title: "Tech Giants", description: "Leading technology companies and innovators." }
];

async function seed() {
    console.log("🚀 Starting Firestore seed...\n");

    const batch = db.batch();

    // 1. Seed Categories
    console.log("📂 Seeding categories...");
    for (const cat of CATEGORIES) {
        const ref = db.collection("categories").doc(cat.slug);
        batch.set(ref, {
            slug: cat.slug,
            title: cat.title,
            description: cat.description,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    // 2. Seed Items
    console.log("📦 Seeding items...");
    let itemCount = 0;
    for (const [slug, items] of Object.entries(MOCK_DATA)) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const docId = `item_${slug}_${i}`;
            const ref = db.collection("items").doc(docId);
            const baseScore = Math.floor(Math.random() * 8000) + 2000;

            batch.set(ref, {
                name: item.name,
                symbol: item.symbol,
                categoryId: slug,
                score: baseScore,
                velocity: parseFloat(((Math.random() * 20) - 10).toFixed(1)),
                momentum: parseFloat(((Math.random() * 10) - 5).toFixed(2)),
                volatility: parseFloat((Math.random() * 10 + 1).toFixed(1)),
                rank: i + 1,
                totalVotes: Math.floor(Math.random() * 5000) + 500,
                trend: Array.from({ length: 15 }, () => Math.floor(Math.random() * 100)),
                imageUrl: null,
                isDampened: Math.random() > 0.85,
                status: "active",
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            itemCount++;
        }
    }
    console.log(`   → ${itemCount} items prepared`);

    // 3. Seed Active Epoch
    console.log("⏱️  Seeding active epoch...");
    const now = Date.now();
    const epochDuration = 30 * 60 * 1000; // 30 minutes
    const epochRef = db.collection("epochs").doc("epoch_1");
    batch.set(epochRef, {
        epochId: 1,
        isActive: true,
        startTime: admin.firestore.Timestamp.fromMillis(now),
        endTime: admin.firestore.Timestamp.fromMillis(now + epochDuration),
        duration: epochDuration,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 4. Seed Market Meta (per category)
    console.log("📊 Seeding market_meta...");
    for (const cat of CATEGORIES) {
        const ref = db.collection("market_meta").doc(cat.slug);
        batch.set(ref, {
            totalStaked: 0,
            itemExposure: {},
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    // 5. Platform Settings
    console.log("⚙️  Seeding platform settings...");
    batch.set(db.collection("settings").doc("platform"), {
        isKilled: false,
        epochDuration: epochDuration,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Commit
    await batch.commit();
    console.log("\n✅ Firestore seeded successfully!");
    console.log(`   Categories: ${CATEGORIES.length}`);
    console.log(`   Items: ${itemCount}`);
    console.log(`   Active Epoch: epoch_1`);
    console.log(`   Market Meta: ${CATEGORIES.length} markets`);

    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
