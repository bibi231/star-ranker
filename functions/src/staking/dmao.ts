/**
 * Star Ranker: Dynamic Market-Adjusted Odds (DMAO) Engine
 * 
 * Core mathematical module for calculating real-time staking odds,
 * implied probabilities, and liquidity-sensitive slippage.
 */

export interface MarketPhysics {
    momentum: number;
    velocity: number;
    volatility: number; // Rolling std dev
    currentRank: number;
}

export interface MarketState {
    totalEscrow: number;
    itemOpenInterest: number;
    liquidityFactor: number; // Admin adjusted (default ~0.5)
}

export interface PayoutConstraints {
    safetyRatio: number; // default 0.1
    platformMargin: number; // 0.02 to 0.06
    maxMultiplier: number; // 8x for exact, 3x for range, 2x for direction
}

/**
 * Calculates base sigmoid probability for a single rank target.
 */
function getRankProb(distance: number, momentumAdj: number, tFactor: number): number {
    const k = 0.5 * tFactor;
    const exponent = k * (distance - momentumAdj);
    return 1 / (1 + Math.exp(exponent));
}

/**
 * Step 1: Implied Base Probability (P_base)
 * Calculates the likelihood of an outcome based on market physics and bet type.
 */
export function calculateBaseProbability(
    physics: MarketPhysics,
    target: any, // rank number | {min, max} | {dir, k}
    type: 'exact' | 'range' | 'directional',
    timeRemainingMs: number
): number {
    const tFactor = 1 + (4 * (1 - Math.min(1, timeRemainingMs / 1800000)));
    const momentumAdj = physics.momentum + (physics.velocity * (timeRemainingMs / 60000));
    const volDampener = Math.max(0.7, 1 - (physics.volatility / 100));

    let pRaw = 0;

    if (type === 'exact') {
        const distance = Math.abs(physics.currentRank - (target as number));
        pRaw = getRankProb(distance, momentumAdj, tFactor);
    }
    else if (type === 'range') {
        const { min, max } = target as { min: number; max: number };
        // Integrate (sum) probabilities for each rank in the range
        // For efficiency, we'll sample the range or use the mid-point adjusted by width
        let sum = 0;
        const width = Math.abs(max - min) + 1;
        for (let r = min; r <= max; r++) {
            const dist = Math.abs(physics.currentRank - r);
            sum += getRankProb(dist, momentumAdj, tFactor);
        }
        // Normalize: Probability of being ANYWHERE in the range
        pRaw = Math.min(0.9, sum / width);
    }
    else if (type === 'directional') {
        const { dir, k } = target as { dir: 'up' | 'down'; k: number };
        // UP: FinalRank <= CurrentRank - K
        // DOWN: FinalRank >= CurrentRank + K
        // We calculate the sum of probabilities for the entire tail
        let sum = 0;
        if (dir === 'up') {
            for (let r = 1; r <= Math.max(1, physics.currentRank - k); r++) {
                const dist = Math.abs(physics.currentRank - r);
                sum += getRankProb(dist, momentumAdj, tFactor);
            }
        } else {
            for (let r = Math.min(100, physics.currentRank + k); r <= 100; r++) {
                const dist = Math.abs(physics.currentRank - r);
                sum += getRankProb(dist, momentumAdj, tFactor);
            }
        }
        pRaw = Math.min(0.8, sum / 20); // Normalized by typical "tail" width
    }

    return Math.min(1, Math.max(0.01, pRaw * volDampener));
}

/**
 * Step 2: Liquidity Adjustment (P_adj)
 * Adjusts probability based on market-wide open interest for the item.
 */
export function adjustForLiquidity(
    pBase: number,
    state: MarketState
): number {
    if (state.totalEscrow === 0) return pBase;

    // OI Factor: probability increases (odds decrease) as more people bet on this item
    const oiRatio = state.itemOpenInterest / (state.totalEscrow * state.liquidityFactor + 1);
    const pAdj = pBase * (1 + oiRatio);

    return Math.min(0.99, pAdj);
}

/**
 * Step 3: Whale Dampening (Effective Stake)
 * Uses sqrt scaling to apply marginal slippage to large stakes.
 */
export function calculateEffectiveStake(amount: number): number {
    if (amount <= 100) return amount;
    const threshold = 100;
    return threshold + (Math.sqrt(amount - threshold) * 10);
}

/**
 * Step 4: Final Quote Generation
 */
export function generateOddsQuote(
    pBase: number,
    state: MarketState,
    constraints: PayoutConstraints,
    stakeAmount: number
): {
    probability: number;
    multiplier: number;
    effectiveMultiplier: number;
    slippage: number;
} {
    const pAdj = adjustForLiquidity(pBase, state);
    const pFinal = pAdj * (1 + constraints.platformMargin);
    const rawMultiplier = Math.min(constraints.maxMultiplier, 1 / pFinal);
    const effectiveStake = calculateEffectiveStake(stakeAmount);
    const effectiveMultiplier = (effectiveStake / stakeAmount) * rawMultiplier;

    return {
        probability: pFinal,
        multiplier: rawMultiplier,
        effectiveMultiplier,
        slippage: 1 - (effectiveMultiplier / rawMultiplier)
    };
}
