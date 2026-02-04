/**
 * Zeitgeist Scoring Algorithm
 * 
 * Calculates the Zeitgeist Score for items based on multiple signals.
 * Z = Σ(wᵢ × sᵢ × cᵢ) × D × A
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

// ============================
// TYPES
// ============================

export interface ZeitgeistSignal {
    source: string;
    signalType: string;
    value: number;
    confidence: number;
    rawData?: any;
    timestamp: Date;
}

export interface ZeitgeistScore {
    score: number;
    signals: {
        searchTrend: number;
        socialVelocity: number;
        reviewVolume: number;
        factualRelevance: number;
        debatability: number;
    };
    confidence: number;
    trend: 'rising' | 'stable' | 'falling';
    trendVelocity: number;
    lastUpdated: Date;
}

export interface MarketWeights {
    searchTrend: number;
    socialVelocity: number;
    reviewVolume: number;
    factualRelevance: number;
    debatability: number;
}

// ============================
// MARKET-SPECIFIC WEIGHTS
// ============================

export const MARKET_WEIGHTS: Record<string, MarketWeights> = {
    crypto: {
        searchTrend: 0.25,
        socialVelocity: 0.35,
        reviewVolume: 0.05,
        factualRelevance: 0.15,
        debatability: 0.20
    },
    smartphones: {
        searchTrend: 0.20,
        socialVelocity: 0.25,
        reviewVolume: 0.30,
        factualRelevance: 0.15,
        debatability: 0.10
    },
    music: {
        searchTrend: 0.30,
        socialVelocity: 0.35,
        reviewVolume: 0.15,
        factualRelevance: 0.10,
        debatability: 0.10
    },
    websites: {
        searchTrend: 0.25,
        socialVelocity: 0.30,
        reviewVolume: 0.15,
        factualRelevance: 0.20,
        debatability: 0.10
    },
    tech: {
        searchTrend: 0.25,
        socialVelocity: 0.25,
        reviewVolume: 0.20,
        factualRelevance: 0.20,
        debatability: 0.10
    },
    games: {
        searchTrend: 0.20,
        socialVelocity: 0.30,
        reviewVolume: 0.25,
        factualRelevance: 0.10,
        debatability: 0.15
    },
    movies: {
        searchTrend: 0.25,
        socialVelocity: 0.25,
        reviewVolume: 0.30,
        factualRelevance: 0.10,
        debatability: 0.10
    },
    // Default weights for new markets
    default: {
        searchTrend: 0.20,
        socialVelocity: 0.25,
        reviewVolume: 0.20,
        factualRelevance: 0.20,
        debatability: 0.15
    }
};

// ============================
// SIGNAL AGGREGATION
// ============================

/**
 * Aggregates signals of a specific type into a single value
 */
export function aggregateSignal(
    signals: ZeitgeistSignal[],
    signalType: string
): { value: number; confidence: number } {
    const relevantSignals = signals.filter(s => s.signalType === signalType);

    if (relevantSignals.length === 0) {
        return { value: 0, confidence: 0 };
    }

    // Weighted average by confidence
    const totalWeight = relevantSignals.reduce((sum, s) => sum + s.confidence, 0);
    const weightedSum = relevantSignals.reduce(
        (sum, s) => sum + s.value * s.confidence,
        0
    );

    const value = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const confidence = Math.min(1, relevantSignals.length / 3); // More sources = higher confidence

    return { value: normalize(value, 0, 100), confidence };
}

/**
 * Calculates the debatability score based on sentiment variance
 */
export function calculateDebatability(signals: ZeitgeistSignal[]): number {
    const sentimentSignals = signals.filter(s =>
        s.signalType === 'sentiment' || s.signalType === 'controversy'
    );

    if (sentimentSignals.length < 2) {
        // Not enough data, return moderate debatability
        return 50;
    }

    // Calculate variance
    const values = sentimentSignals.map(s => s.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    // Higher variance = more debatable (people disagree)
    // Normalize variance to 0-100 scale
    const normalizedVariance = Math.min(100, Math.sqrt(variance) * 2);

    // Also consider engagement signals (more comments/replies = more debate)
    const engagementSignals = signals.filter(s => s.signalType === 'engagement');
    const avgEngagement = engagementSignals.length > 0
        ? engagementSignals.reduce((sum, s) => sum + s.value, 0) / engagementSignals.length
        : 50;

    return (normalizedVariance * 0.6 + avgEngagement * 0.4);
}

/**
 * Calculates overall confidence in the zeitgeist score
 */
export function calculateConfidence(signals: ZeitgeistSignal[]): number {
    // Factors that increase confidence:
    // 1. Number of signals
    const signalCountFactor = Math.min(1, signals.length / 10);

    // 2. Source diversity
    const uniqueSources = new Set(signals.map(s => s.source)).size;
    const diversityFactor = Math.min(1, uniqueSources / 4);

    // 3. Recency of signals
    const now = Date.now();
    const avgAge = signals.reduce((sum, s) => {
        const age = now - new Date(s.timestamp).getTime();
        return sum + age;
    }, 0) / signals.length;
    const recencyFactor = Math.max(0, 1 - avgAge / (7 * 24 * 60 * 60 * 1000)); // Decay over 7 days

    // 4. Average signal confidence
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

    return (
        signalCountFactor * 0.25 +
        diversityFactor * 0.30 +
        recencyFactor * 0.20 +
        avgConfidence * 0.25
    );
}

// ============================
// MAIN SCORER
// ============================

/**
 * Calculates the complete Zeitgeist Score for an item
 */
export function calculateZeitgeistScore(
    signals: ZeitgeistSignal[],
    marketId: string,
    previousScore?: ZeitgeistScore
): ZeitgeistScore {
    const weights = MARKET_WEIGHTS[marketId] || MARKET_WEIGHTS.default;

    // Aggregate each signal type
    const searchTrend = aggregateSignal(signals, 'search_trend');
    const socialVelocity = aggregateSignal(signals, 'social_velocity');
    const reviewVolume = aggregateSignal(signals, 'review_volume');
    const factualRelevance = aggregateSignal(signals, 'factual');
    const debatability = calculateDebatability(signals);

    // Calculate weighted score
    const rawScore =
        weights.searchTrend * searchTrend.value +
        weights.socialVelocity * socialVelocity.value +
        weights.reviewVolume * reviewVolume.value +
        weights.factualRelevance * factualRelevance.value +
        weights.debatability * debatability;

    // Calculate confidence
    const confidence = calculateConfidence(signals);

    // Calculate trend
    let trend: 'rising' | 'stable' | 'falling' = 'stable';
    let trendVelocity = 0;

    if (previousScore) {
        const scoreDiff = rawScore - previousScore.score;
        trendVelocity = scoreDiff;

        if (scoreDiff > 5) trend = 'rising';
        else if (scoreDiff < -5) trend = 'falling';
    }

    return {
        score: Math.round(rawScore * 10) / 10, // Round to 1 decimal
        signals: {
            searchTrend: searchTrend.value,
            socialVelocity: socialVelocity.value,
            reviewVolume: reviewVolume.value,
            factualRelevance: factualRelevance.value,
            debatability
        },
        confidence,
        trend,
        trendVelocity,
        lastUpdated: new Date()
    };
}

// ============================
// DECAY MECHANICS
// ============================

/**
 * Calculates the decay factor for an item
 */
export function calculateDecay(
    lastUpdated: Date,
    totalVotes: number,
    isProtected: boolean
): number {
    if (isProtected) {
        return 1.0; // No decay for protected items
    }

    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (24 * 60 * 60 * 1000);
    const decayRate = 0.02; // 2% per day

    // Exponential decay
    let decayFactor = Math.exp(-decayRate * daysSinceUpdate);

    // High-vote items decay slower
    const voteBonus = Math.min(0.3, totalVotes / 10000);
    decayFactor = Math.min(1, decayFactor + voteBonus);

    return Math.max(0.1, decayFactor); // Never go below 0.1
}

/**
 * Applies admin overrides to the zeitgeist score
 */
export async function applyAdminOverrides(
    itemId: string,
    score: number
): Promise<number> {
    const overrides = await db.collection('admin_overrides')
        .where('itemId', '==', itemId)
        .where('expiresAt', '>', new Date())
        .get();

    let adjustedScore = score;

    for (const doc of overrides.docs) {
        const override = doc.data();

        switch (override.type) {
            case 'boost':
                adjustedScore *= override.value; // e.g., 1.5 = 50% boost
                break;
            case 'suppress':
                adjustedScore *= override.value; // e.g., 0.5 = 50% reduction
                break;
            case 'pin':
                adjustedScore = Math.max(adjustedScore, 95); // Pin to top
                break;
        }
    }

    return Math.min(100, Math.max(0, adjustedScore));
}

// ============================
// UTILITIES
// ============================

function normalize(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Normalizes an item name for deduplication
 */
export function normalizeItemName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ');   // Normalize whitespace
}

/**
 * Creates a deduplication key from a name
 */
export function createDedupeKey(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
