import React from 'react';
import { cn } from '../lib/utils';

const TIER_CONFIG = {
    bronze:   { label: 'Bronze',   emoji: '🥉', color: 'text-[#CD7F32]', bg: 'bg-[#CD7F32]/10', border: 'border-[#CD7F32]/30', glow: '' },
    silver:   { label: 'Silver',   emoji: '🥈', color: 'text-[#C0C0C0]', bg: 'bg-[#C0C0C0]/10', border: 'border-[#C0C0C0]/30', glow: '' },
    gold:     { label: 'Gold',     emoji: '🥇', color: 'text-[#C9A84C]', bg: 'bg-[#C9A84C]/10', border: 'border-[#C9A84C]/30', glow: 'shadow-[0_0_10px_rgba(201,168,76,0.2)]' },
    platinum: { label: 'Platinum', emoji: '💎', color: 'text-[#E5E4E2]', bg: 'bg-[#E5E4E2]/10', border: 'border-[#E5E4E2]/30', glow: 'shadow-[0_0_12px_rgba(229,228,226,0.15)]' },
    diamond:  { label: 'Diamond',  emoji: '🌟', color: 'text-[#B9F2FF]', bg: 'bg-[#B9F2FF]/10', border: 'border-[#B9F2FF]/40', glow: 'shadow-[0_0_15px_rgba(185,242,255,0.2)]' },
    // Legacy tier names (backwards compatibility)
    'Initiate': { label: 'Bronze',  emoji: '🥉', color: 'text-[#CD7F32]', bg: 'bg-[#CD7F32]/10', border: 'border-[#CD7F32]/30', glow: '' },
    'Peer':     { label: 'Silver',  emoji: '🥈', color: 'text-[#C0C0C0]', bg: 'bg-[#C0C0C0]/10', border: 'border-[#C0C0C0]/30', glow: '' },
    'Sage':     { label: 'Gold',    emoji: '🥇', color: 'text-[#C9A84C]', bg: 'bg-[#C9A84C]/10', border: 'border-[#C9A84C]/30', glow: '' },
    'Oracle':   { label: 'Diamond', emoji: '🌟', color: 'text-[#B9F2FF]', bg: 'bg-[#B9F2FF]/10', border: 'border-[#B9F2FF]/40', glow: 'shadow-[0_0_15px_rgba(185,242,255,0.2)]' },
};

/**
 * Influence Tier Badge — renders in three sizes.
 * 
 * @param {string} tier - User's tier key (bronze, silver, gold, platinum, diamond)
 * @param {'sm'|'md'|'lg'} size - Badge size variant
 * @param {boolean} showLabel - Whether to show the tier name text
 */
export function TierBadge({ tier = 'bronze', size = 'md', showLabel = true, className }) {
    const config = TIER_CONFIG[tier] || TIER_CONFIG.bronze;

    const sizeClasses = {
        sm: 'text-[8px] px-1.5 py-0.5 gap-1',
        md: 'text-[10px] px-2 py-1 gap-1.5',
        lg: 'text-xs px-3 py-1.5 gap-2',
    };

    return (
        <span className={cn(
            'inline-flex items-center rounded-full font-black uppercase tracking-widest border',
            sizeClasses[size],
            config.bg,
            config.border,
            config.color,
            config.glow,
            className
        )}>
            <span>{config.emoji}</span>
            {showLabel && <span>{config.label}</span>}
        </span>
    );
}

/**
 * Progress bar towards next tier
 */
export function TierProgress({ reputation = 0, currentTier = 'bronze' }) {
    const thresholds = {
        bronze: { min: 0, max: 499, next: 'silver' },
        silver: { min: 500, max: 1999, next: 'gold' },
        gold: { min: 2000, max: 4999, next: 'platinum' },
        platinum: { min: 5000, max: 9999, next: 'diamond' },
        diamond: { min: 10000, max: Infinity, next: null },
    };

    const tier = thresholds[currentTier] || thresholds.bronze;
    const progress = tier.next 
        ? Math.min(100, ((reputation - tier.min) / (tier.max - tier.min + 1)) * 100)
        : 100;
    const nextConfig = tier.next ? TIER_CONFIG[tier.next] : null;

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <TierBadge tier={currentTier} size="sm" />
                {nextConfig && (
                    <span className={cn('text-[8px] font-black uppercase tracking-widest', nextConfig.color)}>
                        Next: {nextConfig.label} ({reputation}/{tier.max + 1})
                    </span>
                )}
            </div>
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className={cn(
                        "h-full rounded-full transition-all duration-700",
                        currentTier === 'diamond' ? 'bg-[#B9F2FF]' :
                        currentTier === 'platinum' ? 'bg-[#E5E4E2]' :
                        currentTier === 'gold' ? 'bg-[#C9A84C]' :
                        currentTier === 'silver' ? 'bg-[#C0C0C0]' : 'bg-[#CD7F32]'
                    )}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

export default TierBadge;
