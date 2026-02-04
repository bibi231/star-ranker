import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { reifyRankings } from "./rankingEngine";
import { settleBets } from "./settlementOracle";
import { ingestCryptoData } from "./ingestors";
import { applyAVD } from "./antiAbuse";
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
export const getCurrentEpoch = onCall(async (request) => {
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
 * DMAO: Real-time odds calculation for frontend preview.
 */
export const getLiveOdds = onCall(async (request) => {
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
export const placeStakeV2 = onCall(async (request) => {
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
