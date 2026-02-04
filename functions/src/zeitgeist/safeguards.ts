/**
 * Zeitgeist Safeguards
 * 
 * Anti-spam, anti-manipulation, and quality control systems.
 */

import { ZeitgeistSignal } from "./scorer";

// ============================
// SPAM DETECTION
// ============================

const BANNED_PATTERNS = [
    /^https?:\/\//i,           // URLs
    /\b(buy|sale|discount|free|click|subscribe)\b/i, // Spam keywords
    /(.)\1{4,}/,               // Repeated characters (aaaaa)
    /^[\d\s]+$/,               // Only numbers
    /[^\x00-\x7F]{10,}/,       // Long non-ASCII sequences
];

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

/**
 * Checks if an item is spam
 */
export function isSpam(name: string, signals: ZeitgeistSignal[]): boolean {
    // Name length validation
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
        return true;
    }

    // Banned patterns
    if (BANNED_PATTERNS.some(pattern => pattern.test(name))) {
        return true;
    }

    // Minimum signal diversity (at least 2 different sources)
    const uniqueSources = new Set(signals.map(s => s.source)).size;
    if (signals.length > 0 && uniqueSources < 1) {
        return true;
    }

    return false;
}

// ============================
// MANIPULATION DETECTION
// ============================

interface ManipulationAnalysis {
    riskScore: number;      // 0-1, higher = more suspicious
    indicators: string[];   // List of suspicious indicators
    shouldBlock: boolean;   // If true, reject the item
}

/**
 * Detects potential manipulation in signals
 */
export function detectManipulation(
    signals: ZeitgeistSignal[]
): ManipulationAnalysis {
    const indicators: string[] = [];
    let riskScore = 0;

    if (signals.length === 0) {
        return { riskScore: 0, indicators: [], shouldBlock: false };
    }

    // 1. Time clustering (many signals in short window)
    const timeClusterScore = calculateTimeClustering(signals);
    if (timeClusterScore > 0.7) {
        indicators.push(`High time clustering: ${(timeClusterScore * 100).toFixed(1)}%`);
        riskScore += timeClusterScore * 0.3;
    }

    // 2. Single source dominance
    const sourceDominance = calculateSourceDominance(signals);
    if (sourceDominance > 0.8) {
        indicators.push(`Single source dominance: ${(sourceDominance * 100).toFixed(1)}%`);
        riskScore += (sourceDominance - 0.5) * 0.3;
    }

    // 3. Velocity anomaly (sudden spikes)
    const velocityAnomaly = detectVelocityAnomaly(signals);
    if (velocityAnomaly > 0.6) {
        indicators.push(`Velocity anomaly detected: ${(velocityAnomaly * 100).toFixed(1)}%`);
        riskScore += velocityAnomaly * 0.25;
    }

    // 4. Sentiment uniformity (all positive = suspicious)
    const sentimentUniformity = calculateSentimentUniformity(signals);
    if (sentimentUniformity > 0.9) {
        indicators.push(`Suspicious sentiment uniformity: ${(sentimentUniformity * 100).toFixed(1)}%`);
        riskScore += sentimentUniformity * 0.15;
    }

    return {
        riskScore: Math.min(1, riskScore),
        indicators,
        shouldBlock: riskScore > 0.7
    };
}

/**
 * Calculates time clustering of signals
 */
function calculateTimeClustering(signals: ZeitgeistSignal[]): number {
    if (signals.length < 3) return 0;

    // Group signals into 1-hour windows
    const hourWindows = new Map<number, number>();

    for (const signal of signals) {
        const hour = Math.floor(new Date(signal.timestamp).getTime() / (60 * 60 * 1000));
        hourWindows.set(hour, (hourWindows.get(hour) || 0) + 1);
    }

    // Calculate max concentration
    const maxInWindow = Math.max(...hourWindows.values());
    const concentration = maxInWindow / signals.length;

    return concentration;
}

/**
 * Calculates single source dominance
 */
function calculateSourceDominance(signals: ZeitgeistSignal[]): number {
    const sourceCounts = new Map<string, number>();

    for (const signal of signals) {
        sourceCounts.set(signal.source, (sourceCounts.get(signal.source) || 0) + 1);
    }

    const maxCount = Math.max(...sourceCounts.values());
    return maxCount / signals.length;
}

/**
 * Detects velocity anomalies
 */
function detectVelocityAnomaly(signals: ZeitgeistSignal[]): number {
    if (signals.length < 5) return 0;

    // Sort by timestamp
    const sorted = [...signals].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate velocity between consecutive signals
    const velocities: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
        const timeDiff = (new Date(sorted[i].timestamp).getTime() -
            new Date(sorted[i - 1].timestamp).getTime()) / 1000;
        if (timeDiff > 0) {
            velocities.push(1 / timeDiff);
        }
    }

    if (velocities.length < 2) return 0;

    // Check for sudden spikes (3x average)
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const maxVelocity = Math.max(...velocities);

    if (maxVelocity > avgVelocity * 3) {
        return Math.min(1, (maxVelocity / avgVelocity - 1) / 5);
    }

    return 0;
}

/**
 * Calculates sentiment uniformity
 */
function calculateSentimentUniformity(signals: ZeitgeistSignal[]): number {
    const sentiments = signals
        .filter(s => s.signalType === 'sentiment')
        .map(s => s.value);

    if (sentiments.length < 3) return 0;

    // Calculate variance
    const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / sentiments.length;

    // Low variance = high uniformity
    const maxVariance = 2500; // Assuming 0-100 scale, max variance when half at 0, half at 100
    const uniformity = 1 - Math.min(1, variance / maxVariance);

    return uniformity;
}

// ============================
// QUALITY SCORING
// ============================

interface QualityScore {
    score: number;          // 0-100
    factors: {
        signalDiversity: number;
        signalRecency: number;
        nameQuality: number;
        confidenceLevel: number;
    };
}

/**
 * Calculates quality score for an item
 */
export function calculateQualityScore(
    name: string,
    signals: ZeitgeistSignal[]
): QualityScore {
    // 1. Signal diversity (more sources = better)
    const uniqueSources = new Set(signals.map(s => s.source)).size;
    const signalDiversity = Math.min(100, uniqueSources * 25);

    // 2. Signal recency
    const now = Date.now();
    const avgAge = signals.reduce((sum, s) => {
        return sum + (now - new Date(s.timestamp).getTime());
    }, 0) / (signals.length || 1);
    const dayAge = avgAge / (24 * 60 * 60 * 1000);
    const signalRecency = Math.max(0, 100 - dayAge * 10); // Decay 10 points per day

    // 3. Name quality
    const nameQuality = calculateNameQuality(name);

    // 4. Confidence level
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / (signals.length || 1);
    const confidenceLevel = avgConfidence * 100;

    // Weighted total
    const score =
        signalDiversity * 0.25 +
        signalRecency * 0.25 +
        nameQuality * 0.25 +
        confidenceLevel * 0.25;

    return {
        score,
        factors: {
            signalDiversity,
            signalRecency,
            nameQuality,
            confidenceLevel
        }
    };
}

/**
 * Calculates name quality score
 */
function calculateNameQuality(name: string): number {
    let score = 100;

    // Too short
    if (name.length < 3) score -= 30;

    // Too long
    if (name.length > 50) score -= 10;

    // Contains numbers (might be okay for some markets)
    if (/\d/.test(name)) score -= 5;

    // Special characters
    if (/[^\w\s\-'&]/.test(name)) score -= 10;

    // All caps (spam indicator)
    if (name === name.toUpperCase() && name.length > 3) score -= 20;

    // Starts with special character
    if (/^[^\w]/.test(name)) score -= 15;

    return Math.max(0, score);
}

// ============================
// RATE LIMITING
// ============================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks rate limit for a source
 */
export function checkSourceRateLimit(
    source: string,
    maxRequests: number = 100,
    windowMs: number = 60000
): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(source);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(source, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (entry.count >= maxRequests) {
        return false;
    }

    entry.count++;
    return true;
}

// ============================
// DUPLICATE DETECTION
// ============================

/**
 * Calculates similarity between two item names
 */
export function calculateSimilarity(name1: string, name2: string): number {
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();

    if (s1 === s2) return 1;

    // Levenshtein distance
    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);

    return 1 - distance / maxLen;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,      // Deletion
                dp[i][j - 1] + 1,      // Insertion
                dp[i - 1][j - 1] + cost // Substitution
            );
        }
    }

    return dp[m][n];
}

/**
 * Finds near-duplicates in a list of items
 */
export function findNearDuplicates(
    items: { name: string; id?: string }[],
    threshold: number = 0.85
): Array<{ item1: string; item2: string; similarity: number }> {
    const duplicates: Array<{ item1: string; item2: string; similarity: number }> = [];

    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const similarity = calculateSimilarity(items[i].name, items[j].name);

            if (similarity >= threshold) {
                duplicates.push({
                    item1: items[i].name,
                    item2: items[j].name,
                    similarity
                });
            }
        }
    }

    return duplicates;
}
