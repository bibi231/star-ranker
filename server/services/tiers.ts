/**
 * Influence Tier System
 * 
 * Bronze → Silver → Gold → Platinum → Diamond
 * Determines vote weight and per-epoch stake limits.
 */

export const TIERS = {
    bronze:   { name: 'Bronze',   minPoints: 0,     maxPoints: 499,       voteWeight: 1, maxStake: 5000,   color: '#CD7F32', emoji: '🥉' },
    silver:   { name: 'Silver',   minPoints: 500,   maxPoints: 1999,      voteWeight: 2, maxStake: 15000,  color: '#C0C0C0', emoji: '🥈' },
    gold:     { name: 'Gold',     minPoints: 2000,  maxPoints: 4999,      voteWeight: 3, maxStake: 50000,  color: '#C9A84C', emoji: '🥇' },
    platinum: { name: 'Platinum', minPoints: 5000,  maxPoints: 9999,      voteWeight: 4, maxStake: 100000, color: '#E5E4E2', emoji: '💎' },
    diamond:  { name: 'Diamond',  minPoints: 10000, maxPoints: Infinity,  voteWeight: 5, maxStake: 500000, color: '#B9F2FF', emoji: '🌟' },
} as const;

export type TierKey = keyof typeof TIERS;

export function calculateTier(reputation: number): TierKey {
    if (reputation >= 10000) return 'diamond';
    if (reputation >= 5000)  return 'platinum';
    if (reputation >= 2000)  return 'gold';
    if (reputation >= 500)   return 'silver';
    return 'bronze';
}

export function getTierBenefits(tier: TierKey) {
    return TIERS[tier];
}

export function getNextTier(tier: TierKey): TierKey | null {
    const order: TierKey[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const idx = order.indexOf(tier);
    return idx < order.length - 1 ? order[idx + 1] : null;
}
