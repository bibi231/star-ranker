import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { reifyRankings } from "./rankingEngine";
import { settleBets } from "./settlementOracle";
import { ingestCryptoData } from "./ingestors";
// applyAVD is used internally by rankingEngine
import { manageEpochs } from "./epochs/manager";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { generateOddsQuote, calculateBaseProbability } from "./staking/dmao";

// Export admin functions
export * from "./admin/index";

// Export Zeitgeist Market Generator functions
export * from "./zeitgeist/index";

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();


// Periodically reify rankings and create snapshots (30m)
export const reifyMarkets = onSchedule("every 30 minutes", async (event) => {
    // Check killswitch
    const platformSettings = await db.collection("settings").doc("platform").get();
    if (platformSettings.exists && platformSettings.data()?.isKilled) return;

    const categories = await db.collection("categories").get();

    for (const catDoc of categories.docs) {
        const items = await db.collection("items").where("categoryId", "==", catDoc.id).get();
        const rankingItems = items.docs.map(d => d.data() as any);

        const updatedRankings = reifyRankings(rankingItems);

        await db.collection("snapshots").add({
            categorySlug: catDoc.data().slug,
            timestamp: Date.now(),
            rankData: JSON.stringify(updatedRankings.map(i => ({ id: i.id, score: i.score })))
        });
    }
});

// Settlement Oracle Loop (60m)
export const settlePredictions = onSchedule("every 60 minutes", async (event) => {
    const platformSettings = await db.collection("settings").doc("platform").get();
    if (platformSettings.exists && platformSettings.data()?.isKilled) return;

    await settleBets();
});

// Daily Data Ingestion
export const dailyMarketSync = onSchedule("every 24 hours", async (event) => {
    await ingestCryptoData();
});

// Global Epoch Manager (1m Cron)
export const processEpochs = onSchedule("every 1 minute", async (event) => {
    // Check killswitch
    const platformSettings = await db.collection("settings").doc("platform").get();
    if (platformSettings.exists && platformSettings.data()?.isKilled) return;

    await manageEpochs();
});

/**
 * Callable for frontend to fetch the current active epoch.
 */
export const getCurrentEpoch = onCall({ cors: true }, async (request) => {
    const activeQuery = await db.collection("epochs")
        .where("isActive", "==", true)
        .limit(1)
        .get();

    if (activeQuery.empty) {
        throw new HttpsError("not-found", "No active epoch detected.");
    }

    const epoch = activeQuery.docs[0].data();
    return {
        ...epoch,
        startTime: epoch.startTime.toMillis(),
        endTime: epoch.endTime.toMillis(),
        serverTime: Date.now()
    };
});


/**
 * castVote: Server-authoritative voting.
 * Atomically updates the item score and records the vote per-user.
 */
export const castVote = onCall({ cors: true }, async (request) => {
    const { auth } = request;
    if (!auth) throw new HttpsError("unauthenticated", "Auth required.");

    const { itemId, direction, categoryId } = request.data;
    if (!itemId || direction === undefined || !categoryId) {
        throw new HttpsError("invalid-argument", "Missing itemId, direction, or categoryId.");
    }

    // Validate direction: 1 (up), -1 (down), 0 (remove)
    if (![1, -1, 0].includes(direction)) {
        throw new HttpsError("invalid-argument", "Direction must be 1, -1, or 0.");
    }

    const voteId = `${auth.uid}_${itemId}`;

    return await db.runTransaction(async (transaction) => {
        const itemRef = db.collection("items").doc(itemId);
        const voteRef = db.collection("votes").doc(voteId);

        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists) throw new HttpsError("not-found", "Item not found.");

        const voteDoc = await transaction.get(voteRef);
        const previousDirection = voteDoc.exists ? (voteDoc.data()!.direction || 0) : 0;

        // Calculate score delta
        const scoreDelta = direction - previousDirection;

        // Update item score
        const currentScore = itemDoc.data()!.score || 0;
        const currentTotalVotes = itemDoc.data()!.totalVotes || 0;
        const voteCountDelta = direction !== 0 && previousDirection === 0 ? 1 : direction === 0 && previousDirection !== 0 ? -1 : 0;

        transaction.update(itemRef, {
            score: currentScore + scoreDelta,
            totalVotes: currentTotalVotes + voteCountDelta
        });

        // Record or update vote
        if (direction === 0) {
            transaction.delete(voteRef);
        } else {
            transaction.set(voteRef, {
                userId: auth.uid,
                itemId,
                categoryId,
                direction,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return { success: true, newScore: currentScore + scoreDelta };
    });
});

/**
 * DMAO: Real-time odds calculation for frontend preview.
 */
export const getLiveOdds = onCall({ cors: true }, async (request) => {
    const { itemId, amount, target, categoryId, betType } = request.data;
    if (!itemId || !amount || !target || !categoryId || !betType) {
        throw new HttpsError("invalid-argument", "Missing required parameters.");
    }

    // 1. Fetch Item Physics
    const itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) throw new HttpsError("not-found", "Item not found.");
    const itemData = itemDoc.data()!;

    // 2. Fetch Market State (Escrow & OI)
    const marketDoc = await db.collection("market_meta").doc(categoryId).get();
    const marketData = marketDoc.exists ? marketDoc.data()! : { totalStaked: 0, itemExposure: {} };
    const itemOI = (marketData.itemExposure || {})[itemId] || 0;

    // 3. Fetch Epoch Context
    const activeEpochQuery = await db.collection("epochs").where("isActive", "==", true).limit(1).get();
    if (activeEpochQuery.empty) throw new HttpsError("failed-precondition", "No active epoch.");
    const epoch = activeEpochQuery.docs[0].data();
    const timeRemaining = epoch.endTime.toMillis() - Date.now();

    // 4. Calculate Quote
    const pBase = calculateBaseProbability(
        {
            momentum: itemData.momentum || 0,
            velocity: itemData.velocity || 0,
            volatility: itemData.volatility || 5,
            currentRank: itemData.rank || 50
        },
        target,
        betType as any,
        timeRemaining
    );

    const quote = generateOddsQuote(
        pBase,
        {
            totalEscrow: marketData.totalStaked || 0,
            itemOpenInterest: itemOI,
            liquidityFactor: 0.5
        },
        {
            safetyRatio: 0.1,
            platformMargin: 0.04,
            maxMultiplier: 8
        },
        amount
    );

    return quote;
});

/**
 * Authoritative Staking Entrypoint (V2)
 */
export const placeStakeV2 = onCall({ cors: true }, async (request) => {
    const { auth } = request;
    if (!auth) throw new HttpsError("unauthenticated", "Auth required.");

    const { itemId, amount, target, categoryId, itemName, betType } = request.data;

    // Safety: 60s lock before epoch end
    const activeEpochQuery = await db.collection("epochs").where("isActive", "==", true).limit(1).get();
    if (activeEpochQuery.empty) throw new HttpsError("failed-precondition", "No active epoch.");
    const epochDoc = activeEpochQuery.docs[0];
    const epoch = epochDoc.data();

    if (epoch.endTime.toMillis() - Date.now() < 60000) {
        throw new HttpsError("failed-precondition", "Market is locked for snapshot.");
    }

    return await db.runTransaction(async (transaction) => {
        const userRef = db.collection("users").doc(auth.uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new HttpsError("not-found", "User not found.");

        const balance = userDoc.data()!.balance;
        if (balance < amount) throw new HttpsError("failed-precondition", "Insufficient funds.");

        // Re-calculate quote inside transaction for price certainty
        const itemDoc = await transaction.get(db.collection("items").doc(itemId));
        if (!itemDoc.exists) throw new HttpsError("not-found", "Item not found.");
        const itemData = itemDoc.data()!;

        const marketDoc = await transaction.get(db.collection("market_meta").doc(categoryId));
        const marketData = marketDoc.exists ? marketDoc.data()! : { totalStaked: 0, itemExposure: {} };
        const itemExposure = marketData.itemExposure || {};
        const itemOI = itemExposure[itemId] || 0;

        const timeRemaining = epoch.endTime.toMillis() - Date.now();

        const pBase = calculateBaseProbability(
            {
                momentum: itemData.momentum || 0,
                velocity: itemData.velocity || 0,
                volatility: itemData.volatility || 5,
                currentRank: itemData.rank || 50
            },
            target,
            betType as any,
            timeRemaining
        );

        const quote = generateOddsQuote(
            pBase,
            {
                totalEscrow: marketData.totalStaked || 0,
                itemOpenInterest: itemOI,
                liquidityFactor: 0.5
            },
            {
                safetyRatio: 0.1,
                platformMargin: 0.04,
                maxMultiplier: 8
            },
            amount
        );

        transaction.update(userRef, { balance: balance - amount });

        // Update Market Exposure
        const newItemExposure = { ...itemExposure, [itemId]: itemOI + amount };
        transaction.set(db.collection("market_meta").doc(categoryId), {
            totalStaked: (marketData.totalStaked || 0) + amount,
            itemExposure: newItemExposure
        }, { merge: true });

        const stakeRef = db.collection("stakes").doc();
        transaction.set(stakeRef, {
            userId: auth.uid,
            itemId,
            itemName,
            categoryId,
            amount,
            target,
            betType,
            initialRank: itemData.rank || 50, // CRITICAL for directional bets
            status: 'active',
            epochId: epoch.epochId,
            deadline: epoch.endTime,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isSettled: false,
            // DMAO Audit Data
            impliedProbability: quote.probability,
            slippageApplied: quote.slippage,
            effectiveMultiplier: quote.effectiveMultiplier,
            multiplierUsed: quote.multiplier, // Base quote
            isDMAO: true
        });

        return { success: true, stakeId: stakeRef.id };
    });
});

/**
 * One-time seed function to populate Firestore with initial data.
 * Call once after deploy, then remove or disable.
 */
export const seedDatabase = onCall({ cors: true }, async (request) => {
    const { auth } = request;
    if (!auth) throw new HttpsError("unauthenticated", "Auth required.");

    const SEED_DATA: Record<string, Array<{ name: string; symbol: string }>> = {
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

    const batch = db.batch();
    let itemCount = 0;

    // Seed categories
    for (const cat of CATEGORIES) {
        batch.set(db.collection("categories").doc(cat.slug), {
            slug: cat.slug, title: cat.title, description: cat.description,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    // Seed items
    for (const [slug, items] of Object.entries(SEED_DATA)) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const docId = `item_${slug}_${i}`;
            const baseScore = Math.floor(Math.random() * 8000) + 2000;
            batch.set(db.collection("items").doc(docId), {
                name: item.name, symbol: item.symbol, categoryId: slug,
                score: baseScore,
                velocity: parseFloat(((Math.random() * 20) - 10).toFixed(1)),
                momentum: parseFloat(((Math.random() * 10) - 5).toFixed(2)),
                volatility: parseFloat((Math.random() * 10 + 1).toFixed(1)),
                rank: i + 1,
                totalVotes: Math.floor(Math.random() * 5000) + 500,
                trend: Array.from({ length: 15 }, () => Math.floor(Math.random() * 100)),
                imageUrl: null, isDampened: Math.random() > 0.85, status: "active",
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            itemCount++;
        }
    }

    // Seed epoch
    const now = Date.now();
    const epochDuration = 30 * 60 * 1000;
    batch.set(db.collection("epochs").doc("epoch_1"), {
        epochId: 1, isActive: true,
        startTime: admin.firestore.Timestamp.fromMillis(now),
        endTime: admin.firestore.Timestamp.fromMillis(now + epochDuration),
        duration: epochDuration,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Seed market_meta
    for (const cat of CATEGORIES) {
        batch.set(db.collection("market_meta").doc(cat.slug), {
            totalStaked: 0, itemExposure: {},
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    // Platform settings
    batch.set(db.collection("settings").doc("platform"), {
        isKilled: false, epochDuration,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();

    return {
        success: true,
        categories: CATEGORIES.length,
        items: itemCount,
        message: "Database seeded successfully"
    };
});

