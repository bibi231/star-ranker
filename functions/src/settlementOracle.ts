import * as admin from 'firebase-admin';

interface Stake {
    id: string;
    userId: string;
    itemId: string;
    amount: number;
    targetRank: number;
    deadline: number; // timestamp
    isSettled: boolean;
}

interface Snapshot {
    id: string;
    categorySlug: string;
    timestamp: number;
    rankData: string; // JSON string [ { id, rank } ]
}

export async function settleBets() {
    const db = admin.firestore();
    const now = Date.now();

    console.log("Starting Settlement Oracle Loop...");

    // 1. Fetch expired, unsettled stakes
    const stakesQuery = await db.collection('stakes')
        .where('deadline', '<=', now)
        .where('isSettled', '==', false)
        .limit(100) // Batching for scale
        .get();

    if (stakesQuery.empty) {
        console.log("No stakes to settle.");
        return;
    }

    for (const doc of stakesQuery.docs) {
        const stake = doc.data() as Stake;

        // 2. Find the closest snapshot to the deadline
        const snapshotQuery = await db.collection('snapshots')
            .where('timestamp', '<=', stake.deadline)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (snapshotQuery.empty) {
            console.warn(`No snapshot found for stake ${stake.id} near deadline.`);
            continue;
        }

        const snapshot = snapshotQuery.docs[0].data() as Snapshot;
        const rankData = JSON.parse(snapshot.rankData);
        const actualRank = rankData.findIndex((item: any) => item.id === stake.itemId) + 1;

        // 3. Determine Result & Payout
        let payout = 0;
        const isWin = actualRank === stake.targetRank;
        const isClose = Math.abs(actualRank - stake.targetRank) === 1;

        if (isWin) {
            payout = stake.amount * 5; // 5x multiplier for exact match
        } else if (isClose) {
            payout = stake.amount * 1.5; // 1.5x multiplier for close range
        }

        // 4. Atomic Transaction: Mark Settled + Update Balance
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(stake.userId);
            const stakeRef = doc.ref;

            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return;

            const currentBalance = userDoc.data()?.balance || 0;

            transaction.update(userRef, { balance: currentBalance + payout });
            transaction.update(stakeRef, {
                isSettled: true,
                actualRank,
                payout,
                settledAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        console.log(`Settled stake ${stake.id}: Rank ${actualRank} vs Target ${stake.targetRank}. Payout: ${payout}`);
    }
}
