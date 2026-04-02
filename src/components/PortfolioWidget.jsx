import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Zap, Shield, BarChart3, Target } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';

export function PortfolioWidget() {
    const { stakes, items, formatValue, user } = useStore();

    const stats = useMemo(() => {
        if (!stakes || stakes.length === 0) return { invested: 0, potential: 0, pnl: 0, pnlPercent: 0 };

        const invested = stakes.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        
        let potential = 0;
        stakes.forEach(stake => {
            const currentItem = items.find(i => i.docId === stake.itemDocId);
            if (currentItem && currentItem.rank === stake.targetRank) {
                potential += (Number(stake.amount) || 0) * (Number(stake.odds) || 1);
            }
        });

        const pnl = potential - invested;
        const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

        return { invested, potential, pnl, pnlPercent };
    }, [stakes, items]);

    if (!stakes || stakes.length === 0) {
        return (
            <div className="command-panel flex flex-col items-center justify-center py-16 text-center space-y-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-white/5 mb-2">
                    <Target size={32} className="text-slate-600" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white tracking-tight">System Idle</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">No active deployments detected in the current epoch</p>
                </div>
                <button 
                   onClick={() => window.location.href = '/markets'}
                   className="premium-btn-cyan px-8 py-3 rounded-2xl text-[10px] tracking-[0.2em] uppercase mt-4"
                >
                    Initialize Operations
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
            {/* Main Command Card */}
            <div className="lg:col-span-2 command-panel relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BarChart3 size={120} className="text-brand-accent" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                            <Shield size={20} className="text-brand-accent" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Oracle Command</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Active Portfolio Synthesis</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Total Exposure</span>
                            <div className="text-4xl font-black text-white font-mono italic tracking-tighter">
                                {formatValue(stats.invested)}
                            </div>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Reputation Power</span>
                            <div className="text-4xl font-black text-brand-accent font-mono italic tracking-tighter">
                                {user?.reputation?.toLocaleString() || '100'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Potential Yield Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-8 flex flex-col justify-between group hover:border-emerald-500/30 transition-all">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <Zap size={16} className="text-emerald-400" />
                        </div>
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live Forecast</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Potential Payout</span>
                    <div className="text-2xl font-black text-white font-mono italic">
                        {formatValue(stats.potential)}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Efficiency</span>
                        <span className="text-[10px] font-black text-emerald-400">{(stats.invested > 0 ? (stats.potential / stats.invested).toFixed(2) : 0)}x</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '65%' }}
                            className="h-full bg-emerald-500"
                        />
                    </div>
                </div>
            </div>

            {/* Performance Card */}
            <div className={cn(
                "backdrop-blur-xl border rounded-3xl p-8 flex flex-col justify-between group transition-all",
                stats.pnl >= 0 
                  ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40" 
                  : "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40"
            )}>
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className={cn(
                            "p-2 rounded-lg border",
                            stats.pnl >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
                        )}>
                            {stats.pnl >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-rose-400" />}
                        </div>
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            stats.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                            {stats.pnl >= 0 ? 'Surplus' : 'Deficit'}
                        </span>
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Unrealized P&L</span>
                    <div className={cn(
                        "text-2xl font-black font-mono italic",
                        stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                        {stats.pnl >= 0 ? '+' : '-'}{formatValue(Math.abs(stats.pnl))}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Net Variance</span>
                        <span className={cn(
                            "text-[10px] font-black",
                            stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {stats.pnl >= 0 ? '+' : ''}{stats.pnlPercent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
