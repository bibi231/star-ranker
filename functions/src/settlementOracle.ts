import * as admin from 'firebase-admin';

interface Stake {
    id: string;
    userId: string;
    itemId: string;
    amount: number;
    target: any; // number | {min, max} | {dir, k}
    betType: 'exact' | 'range' | 'directional';
    initialRank?: number;
    deadline: any; // Firestore Timestamp
    isSettled: boolean;
    isDMAO?: boolean;
    effectiveMultiplier?: number;
}

interface EpochSnapshot {
    epochId: number;
    categoryId: string;
    rankings: Array<{
        itemId: string;
        name: string;
        score: number;
        momentum: number;
        velocity: number;
        rank: number;
    }>;
    createdAt: admin.firestore.Timestamp;
}

export async function settleBets() {
    const db = admin.firestore();
    const now = Date.now();

    console.log("Starting Settlement Oracle Loop (DMAO Aware)...");

    // 1. Fetch expired, unsettled stakes
    const stakesQuery = await db.collection('stakes')
        .where('deadline', '<=', admin.firestore.Timestamp.fromMillis(now))
        .where('isSettled', '==', false)
        .limit(100)
        .get();

    if (stakesQuery.empty) {
        console.log("No stakes to settle.");
        return;
    }

    for (const stakeDoc of stakesQuery.docs) {
        const stake = stakeDoc.data() as Stake;
        stake.id = stakeDoc.id;

        // 2. Find the closest epoch snapshot to the deadline
        const snapshotQuery = await db.collection('epoch_snapshots')
            .where('createdAt', '>=', stake.deadline)
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();

        if (snapshotQuery.empty) {
            console.warn(`No epoch snapshot found for stake ${stake.id} at deadline ${stake.deadline.toMillis()}.`);
            continue;
        }

        const snapshot = snapshotQuery.docs[0].data() as EpochSnapshot;
        const itemRecord = snapshot.rankings.find(r => r.itemId === stake.itemId);
        const actualRank = itemRecord ? itemRecord.rank : 999;

        // 3. Evaluate Win Condition based on Bet Type
        let isWin = false;
        let payout = 0;

        if (stake.isDMAO) {
            if (stake.betType === 'exact') {
                isWin = actualRank === (stake.target as number);
            }
            else if (stake.betType === 'range') {
                const { min, max } = stake.target as { min: number; max: number };
                isWin = actualRank >= min && actualRank <= max;
            }
            else if (stake.betType === 'directional') {
                const { dir, k } = stake.target as { dir: 'up' | 'down'; k: number };
                const initial = stake.initialRank || 50;
                if (dir === 'up') {
                    isWin = actualRank <= initial - k;
                } else {
                    isWin = actualRank >= initial + k;
                }
            }

            if (isWin) {
                payout = stake.amount * (stake.effectiveMultiplier || 1);
            }
        }
        else {
            // Legacy Settlement Logic (Pre-DMAO)
            const targetRank = typeof stake.target === 'number' ? stake.target : 1;
            isWin = actualRank === targetRank;
            if (isWin) {
                payout = stake.amount * (4 / targetRank);
            } else if (Math.abs(actualRank - targetRank) === 1) {
                payout = stake.amount * 1.1;
            }
        }

        // 4. Atomic Transaction: Mark Settled + Update Balance
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(stake.userId);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return;

            const currentBalance = userDoc.data()?.balance || 0;

            transaction.update(userRef, { balance: currentBalance + payout });
            transaction.update(stakeDoc.ref, {
                isSettled: true,
                actualRank,
                payout,
                win: isWin,
                settledAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        console.log(`Settled stake ${stake.id} [${stake.betType || 'legacy'}]: Rank ${actualRank} vs Target ${JSON.stringify(stake.target)}. Win: ${isWin}, Payout: ${payout}`);
    }
}
