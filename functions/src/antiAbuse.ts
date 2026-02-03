export interface VoteCapture {
    userId: string;
    itemId: string;
    timestamp: number;
    ip: string;
    weight: number;
}

export interface UserStats {
    reputation: number;
    accountAgeDays: number;
    voteCount24h: number;
    providerLinked: boolean;
}

const VELOCITY_THRESHOLD_1H = 20; // Reduced from 50: Max votes per hour for a single item
const USER_DAILY_QUOTA = 50; // New: Limit per user to control costs

// Ratio of votes from same IP subnet
export function calculateConfidenceScore(vote: VoteCapture, user: UserStats, historicalVotes: VoteCapture[]): number {
    let score = 1.0;

    // 1. Velocity Check (Item Spiking)
    const itemVotes1h = historicalVotes.filter(v => v.itemId === vote.itemId && v.timestamp > vote.timestamp - 3600000);
    if (itemVotes1h.length > VELOCITY_THRESHOLD_1H) {
        score *= 0.5; // Dampen confidence due to high velocity spike
    }

    // 2. User Account Age & Provider
    if (user.accountAgeDays < 7) {
        score *= 0.7; // New accounts are suspicious
    }
    if (!user.providerLinked) {
        score *= 0.5; // No social provider linked
    }

    // 3. User Rate Limiting
    if (user.voteCount24h > USER_DAILY_QUOTA) {
        score *= 0.1; // Harder dampening for reaching daily quota
    }


    // 4. IP Clustering (Sybil Detection)
    const ipMatches = historicalVotes.filter(v => v.ip === vote.ip && v.timestamp > vote.timestamp - 600000);
    if (ipMatches.length > 5) {
        score *= 0.4; // Multiple votes from same IP in 10 mins
    }

    return Math.max(0, Math.min(1.0, score));
}

export function applyAVD(vote: VoteCapture, user: UserStats, historicalVotes: VoteCapture[]): number {
    const confidence = calculateConfidenceScore(vote, user, historicalVotes);

    if (confidence < 0.2) {
        return 0; // Shadow ban: vote has zero effect
    }

    return vote.weight * confidence; // Proportional weight dampening
}
