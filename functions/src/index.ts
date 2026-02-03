import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { reifyRankings } from "./rankingEngine";
import { settleBets } from "./settlementOracle";
import { ingestCryptoData } from "./ingestors";
import { applyAVD } from "./antiAbuse";

admin.initializeApp();

// Periodically reify rankings and create snapshots (30m)
export const reifyMarkets = onSchedule("every 30 minutes", async (event) => {
    const db = admin.firestore();
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
    await settleBets();
});

// Daily Data Ingestion
export const dailyMarketSync = onSchedule("every 24 hours", async (event) => {
    await ingestCryptoData();
});

// Production Vote Processor with AVD
export const processIncomingVote = async (vote: any, userStats: any, history: any[]) => {
    const finalWeight = applyAVD(vote, userStats, history);
    if (finalWeight === 0) return { status: "DAMPENED" };

    // Apply finalWeight to ranking math...
    return { status: "PROCESSED", weight: finalWeight };
};
