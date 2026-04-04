import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart2, Activity, Shield, Zap, Target } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Signal Intelligence Card — Bloomberg-style data panel for individual items.
 * Shows market physics: momentum, velocity, volatility, rank trajectory, and risk level.
 * 
 * @param {Object} item - The market item data object
 * @param {Object} odds - Optional odds quote data
 */
export function SignalIntelligence({ item, odds, className }) {
    if (!item) return null;

    const momentum = item.momentum ?? 0;
    const velocity = item.velocity ?? 0;
    const volatility = item.volatility ?? 5;
    const rank = item.rank ?? 99;
    const totalVotes = item.totalVotes ?? 0;

    // Derive risk level from volatility
    const riskLevel = volatility > 8 ? 'HIGH' : volatility > 4 ? 'MED' : 'LOW';
    const riskColor = riskLevel === 'HIGH' ? 'text-[#FF3366]' : riskLevel === 'MED' ? 'text-[#FFB800]' : 'text-[#00FF88]';

    // Derive trend direction
    const trendUp = velocity > 0;
    const TrendIcon = trendUp ? TrendingUp : TrendingDown;
    const trendColor = trendUp ? 'text-[#00FF88]' : 'text-[#FF3366]';

    // Implied probability from odds
    const impliedProb = odds?.probability ? (odds.probability * 100).toFixed(1) : null;

    const dataPoints = [
        { label: 'MOMENTUM', value: momentum.toFixed(3), icon: Activity, color: momentum > 0 ? 'text-emerald-400' : momentum < 0 ? 'text-rose-400' : 'text-slate-500' },
        { label: 'VELOCITY', value: `${velocity > 0 ? '+' : ''}${velocity.toFixed(3)}`, icon: Zap, color: trendColor },
        { label: 'VOLATILITY', value: volatility.toFixed(1), icon: BarChart2, color: riskColor },
        { label: 'VOTES', value: totalVotes.toLocaleString(), icon: Target, color: 'text-brand-accent' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("glass-panel rounded-2xl overflow-hidden", className)}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Shield size={12} className="text-brand-accent" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Signal Intelligence
                    </span>
                </div>
                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest", 
                    riskLevel === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    riskLevel === 'MED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                )}>
                    <div className={cn("w-1 h-1 rounded-full",
                        riskLevel === 'HIGH' ? 'bg-rose-400' : riskLevel === 'MED' ? 'bg-amber-400' : 'bg-emerald-400'
                    )} />
                    {riskLevel} RISK
                </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-2 gap-px bg-white/[0.03]">
                {dataPoints.map((dp) => (
                    <div key={dp.label} className="px-4 py-3 bg-brand-bg/40 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-1.5 mb-1">
                            <dp.icon size={10} className="text-slate-600" />
                            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600">{dp.label}</span>
                        </div>
                        <span className={cn("text-sm font-mono font-black", dp.color)}>
                            {dp.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Bottom Bar: Rank + Trend + Implied Probability */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-brand-bg/20">
                <div className="flex items-center gap-3">
                    <div className="text-center">
                        <div className="text-[7px] font-black uppercase tracking-widest text-slate-600 mb-0.5">RANK</div>
                        <div className="text-lg font-mono font-black text-white">#{rank}</div>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex items-center gap-1.5">
                        <TrendIcon size={14} className={trendColor} />
                        <span className={cn("text-[10px] font-mono font-bold", trendColor)}>
                            {trendUp ? 'RISING' : 'FALLING'}
                        </span>
                    </div>
                </div>
                {impliedProb && (
                    <div className="text-right">
                        <div className="text-[7px] font-black uppercase tracking-widest text-slate-600 mb-0.5">IMPLIED PROB</div>
                        <div className="text-sm font-mono font-black text-brand-accent">{impliedProb}%</div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default SignalIntelligence;
