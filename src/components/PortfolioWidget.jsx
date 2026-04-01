import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Zap, ArrowUpRight } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';

export function PortfolioWidget() {
    const { stakes, items, formatValue } = useStore();

    const stats = useMemo(() => {
        if (!stakes || stakes.length === 0) return { invested: 0, potential: 0, pnl: 0, pnlPercent: 0 };

        const invested = stakes.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        
        let potential = 0;
        stakes.forEach(stake => {
            // Find current item in global store to check its rank
            const currentItem = items.find(i => i.id === stake.itemId || i.docId === stake.itemDocId);
            
            // If current rank matches target rank, the payout is "active"
            if (currentItem && currentItem.rank === stake.targetRank) {
                potential += (Number(stake.amount) || 0) * (Number(stake.odds) || 1);
            }
        });

        const pnl = potential - invested;
        const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

        return { invested, potential, pnl, pnlPercent };
    }, [stakes, items]);

    if (!stakes || stakes.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl group hover:border-brand-accent/30 transition-all">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Wallet size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Total Deployed</span>
                </div>
                <div className="text-2xl font-black text-white font-mono italic">
                    {formatValue(stats.invested)}
                </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Zap size={14} className="text-brand-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Current Potential</span>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono italic">
                    {formatValue(stats.potential)}
                </div>
            </div>

            <div className={cn(
                "p-6 rounded-3xl bg-slate-900 border shadow-xl group transition-all",
                stats.pnl >= 0 ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-rose-500/20 hover:border-rose-500/40"
            )}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-500">
                        {stats.pnl >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Unrealized P&L</span>
                    </div>
                    <div className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                        stats.pnl >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                        {stats.pnl >= 0 ? '+' : ''}{stats.pnlPercent.toFixed(1)}%
                    </div>
                </div>
                <div className={cn(
                    "text-2xl font-black font-mono italic",
                    stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                    {formatValue(Math.abs(stats.pnl))}
                </div>
            </div>
        </div>
    );
}
