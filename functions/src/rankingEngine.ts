/**
 * Star Ranker: Momentum-Weighted Ranking (MWR) Engine
 * 
 * This engine calculates the "physics" of the ranking system.
 * It is designed to be run as a background task (Cloud Function)
 * triggered by new votes or on a periodic schedule.
 */

interface RankingItem {
    id: string;
    score: number;
    momentum: number;
    velocity: number;
    lastUpdated: number; // timestamp
}

interface VoteEvent {
    userId: string;
    itemId: string;
    weight: number;
    direction: number; // 1 or -1
    timestamp: number;
}

const GRAVITY = 0.05; // Decay constant (gamma)
const VISCOSITY = 1.0; // Resistance to movement

/**
 * Calculates the new state of an item after a vote.
 */
export function processVote(item: RankingItem, vote: VoteEvent): Partial<RankingItem> {
    const now = Date.now();
    const deltaT = (now - item.lastUpdated) / 1000; // time in seconds

    // 1. Apply Entropy (Decay) to existing momentum
    // P_t = P_t-1 * e^(-gamma * deltaT)
    const decayedMomentum = item.momentum * Math.exp(-GRAVITY * deltaT);

    // 2. Calculate Instantaneous Velocity Contribution
    // v = (voteWeight * direction) / viscosity
    const voteVelocity = (vote.weight * vote.direction) / VISCOSITY;

    // 3. New Momentum
    const newMomentum = decayedMomentum + voteVelocity;

    // 4. Calculate Velocity (Rate of change)
    const newVelocity = (newMomentum - item.momentum) / (deltaT || 1);

    // 5. Update Final Score
    // S = Baseline (0.3 of sum) + Momentum (0.7 of physics)
    // For simplicity here, we'll just use the momentum-based score increment
    const newScore = item.score + voteVelocity + (newMomentum * 0.1);

    return {
        score: Math.max(0, newScore),
        momentum: newMomentum,
        velocity: newVelocity,
        lastUpdated: now
    };
}

/**
 * Batch process for periodic "Reification"
 * This would be called by a scheduled function every 60s.
 */
export function reifyRankings(items: RankingItem[]): RankingItem[] {
    const now = Date.now();

    return items.map(item => {
        const deltaT = (now - item.lastUpdated) / 1000;

        // Pure decay when no votes are present
        const decayedMomentum = item.momentum * Math.exp(-GRAVITY * deltaT);

        return {
            ...item,
            momentum: decayedMomentum,
            velocity: (decayedMomentum - item.momentum) / (deltaT || 1),
            lastUpdated: now
        };
    }).sort((a, b) => b.score - a.score);
}
