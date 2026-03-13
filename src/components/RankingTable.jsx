import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, Zap, ChevronUp, ChevronDown, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/storeModel';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';

export function RankingTable() {
    const navigate = useNavigate();
    const {
        getFilteredItems,
        vote,
        userVotes,
        openModal,
        isSyncing,
        user
    } = useStore();

    const isMobile = useIsMobile();
    const items = getFilteredItems();

    if (isSyncing && items.length === 0) {
        return (
            <div className="w-full border border-slate-800 rounded-3xl bg-slate-900 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-center flex-col gap-4 py-32">
                    <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                    <span className="text-[10px] font-black text-slate-500 tracking-[0.2em]">Synchronizing Oracle Data...</span>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="w-full border border-slate-800 rounded-3xl bg-slate-900 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-center flex-col gap-4 py-32">
                    <Star size={32} className="text-slate-700" />
                    <span className="text-[10px] font-black text-slate-500 tracking-[0.2em]">No items found in this category</span>
                </div>
            </div>
        );
    }

    if (isMobile) {
        return (
            <div className="flex flex-col gap-2 px-3 py-2 pb-6">
                {items.map((item, index) => (
                    <MobileItemCard key={item.id} item={item} index={index} />
                ))}
            </div>
        );
    }

    return (
        <div className="w-full border border-slate-800 rounded-3xl bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
            {/* Desktop Table Header */}
            <div className="hidden md:flex items-center px-6 py-4 bg-slate-950/50 border-b border-slate-800 shrink-0">
                <div className="w-16 shrink-0 text-center font-black text-[9px] text-slate-500 tracking-widest">Rank</div>
                <div className="flex-1 font-black text-[9px] text-slate-500 tracking-widest">Oracle Context</div>
                <div className="w-28 shrink-0 text-right font-black text-[9px] text-slate-500 tracking-widest">Score</div>
                <div className="w-28 shrink-0 text-right pr-4 font-black text-[9px] text-slate-500 tracking-widest">Velocity</div>
                <div className="w-40 shrink-0 text-center font-black text-[9px] text-slate-500 tracking-widest">Operations</div>
            </div>

            {/* Scrollable Item List */}
            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar divide-y divide-slate-800/50">
                {items.map((item, index) => {
                    const currentVote = userVotes[item.id];
                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.02, 0.5) }}
                            className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                            onClick={() => navigate(`/market/${item.id}`)}
                        >
                            {/* Desktop Row */}
                            <div className="hidden md:flex items-center px-6 py-3">
                                {/* Rank */}
                                <div className="w-16 shrink-0 text-center">
                                    <span className={cn(
                                        "font-mono text-base font-black italic",
                                        index === 0 ? "text-amber-400" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-700" : "text-slate-600"
                                    )}>
                                        #{index + 1}
                                    </span>
                                </div>

                                {/* Oracle Context */}
                                <div className="flex-1 flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-brand-accent/30 transition-all overflow-hidden relative shrink-0">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                                        ) : (
                                            <Star size={16} className="text-slate-700" />
                                        )}
                                        {index === 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-bl flex items-center justify-center"><Star size={6} fill="black" /></div>}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-black text-white tracking-tight text-xs truncate">{item.name}</span>
                                            {item.symbol && <span className="text-[8px] text-slate-600 font-bold">{item.symbol}</span>}
                                            {item.isSponsored && (
                                                <div className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded flex items-center gap-1 shrink-0 animate-pulse">
                                                    <span className="text-[7px] font-black text-amber-500 tracking-widest">{item.sponsorLabel || 'SPONSORED'}</span>
                                                </div>
                                            )}
                                            {item.isDampened && (
                                                <ShieldAlert size={10} className="text-brand-accent animate-pulse shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] text-slate-500 font-black tracking-widest shrink-0">Vol: {item.totalVotes?.toLocaleString()}</span>
                                            <Sparkline data={item.trend} color={item.velocity >= 0 ? "#10b981" : "#ef4444"} />
                                        </div>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="w-28 shrink-0 text-right">
                                    <span className="font-mono text-xs font-black text-slate-100 italic">
                                        {Math.floor(item.score || 0).toLocaleString()}
                                    </span>
                                </div>

                                {/* Velocity */}
                                <div className="w-28 shrink-0 text-right pr-4">
                                    <div className={cn(
                                        "inline-flex items-center gap-1 font-mono text-[9px] font-black px-2 py-0.5 rounded-lg",
                                        (item.velocity || 0) >= 0
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-rose-500/10 text-rose-400"
                                    )}>
                                        {(item.velocity || 0) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        {Math.abs(item.velocity || 0).toFixed(1)}%
                                    </div>
                                </div>

                                {/* Operations */}
                                <div className="w-40 shrink-0 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="relative">
                                        <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                                            <button
                                                onClick={() => vote(item.id, 1)}
                                                className={cn(
                                                    "w-7 h-7 rounded flex items-center justify-center transition-all",
                                                    currentVote === 'up' ? "bg-brand-accent text-slate-950" : "text-slate-600 hover:text-white hover:bg-slate-800"
                                                )}
                                            >
                                                <ChevronUp size={16} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={() => vote(item.id, -1)}
                                                className={cn(
                                                    "w-7 h-7 rounded flex items-center justify-center transition-all",
                                                    currentVote === 'down' ? "bg-rose-500 text-white" : "text-slate-600 hover:text-white hover:bg-slate-800"
                                                )}
                                            >
                                                <ChevronDown size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                        {user?.powerVotes > 0 && (
                                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-950 border border-amber-500/50 flex items-center justify-center shadow-lg" title={`${user.powerVotes} Power Votes available`}>
                                                <Zap size={8} className="text-amber-500 fill-amber-500 animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => openModal('stake', item)}
                                        className="h-8 px-3 rounded-lg bg-emerald-500 text-slate-950 font-black text-[9px] tracking-widest hover:bg-white hover:scale-105 transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-1.5"
                                    >
                                        <Zap size={12} fill="currentColor" />
                                        Stake
                                    </button>
                                </div>
                            </div>

                            {/* Mobile Row */}
                            <div className="flex md:hidden items-center px-4 py-3 gap-3">
                                {/* Rank */}
                                <div className="shrink-0">
                                    <span className={cn(
                                        "font-mono text-sm font-black italic",
                                        index === 0 ? "text-amber-400" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-700" : "text-slate-600"
                                    )}>
                                        #{index + 1}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-black text-white text-xs truncate max-w-full">{item.name}</span>
                                        {item.isSponsored && (
                                            <div className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded flex items-center gap-1 shrink-0 animate-pulse">
                                                <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest">{item.sponsorLabel || 'SPONSORED'}</span>
                                            </div>
                                        )}
                                        {item.isDampened && <ShieldAlert size={10} className="text-brand-accent animate-pulse shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] text-slate-500 font-bold">{item.symbol}</span>
                                        <span className="text-[8px] text-slate-600 font-mono">{Math.floor(item.score || 0).toLocaleString()} pts</span>
                                        <div className={cn(
                                            "inline-flex items-center gap-0.5 text-[8px] font-black",
                                            (item.velocity || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                        )}>
                                            {(item.velocity || 0) >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                                            {Math.abs(item.velocity || 0).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Actions */}
                                <div className="flex items-center gap-1.5 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                                    {user?.powerVotes > 0 && (
                                        <div className="absolute -top-2 left-1 z-10 w-4 h-4 rounded-full bg-slate-950 border border-amber-500/50 flex items-center justify-center shadow-lg" title={`${user.powerVotes} Power Votes available`}>
                                            <Zap size={8} className="text-amber-500 fill-amber-500 animate-pulse" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => vote(item.id, 1)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                            currentVote === 'up' ? "bg-brand-accent text-slate-950" : "bg-slate-800 text-slate-500 active:bg-slate-700"
                                        )}
                                    >
                                        <ChevronUp size={18} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={() => vote(item.id, -1)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                            currentVote === 'down' ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-500 active:bg-slate-700"
                                        )}
                                    >
                                        <ChevronDown size={18} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={() => openModal('stake', item)}
                                        className="h-8 px-2.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-[8px] tracking-wider active:scale-95 transition-all flex items-center gap-1"
                                    >
                                        <Zap size={10} fill="currentColor" />
                                        Stake
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="px-6 py-2 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[8px] font-black text-slate-600 tracking-widest">
                <span>Rendering {items.length} Units</span>
                <span className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    Oracle Feed Active
                </span>
            </div>
        </div>
    );
}

function MobileItemCard({ item, index }) {
    const navigate = useNavigate();
    const { vote, userVotes, openModal, user } = useStore();
    const currentVote = userVotes[item.id];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.3) }}
            onClick={() => navigate(`/market/${item.id}`)}
            className="bg-[#1E3A5F]/40 rounded-xl border border-white/10 flex items-center gap-3 px-4 py-3 active:bg-[#1E3A5F]/70 transition-colors cursor-pointer"
        >
            {/* Rank badge */}
            <span className={cn(
                "font-black text-lg w-6 text-center flex-shrink-0",
                index === 0 ? "text-[#C9A84C]" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-700" : "text-slate-500"
            )}>
                {index + 1}
            </span>

            {/* Item info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-white text-sm truncate max-w-[85%]">{item.name}</p>
                    {item.symbol && <span className="text-[9px] text-slate-500 font-bold">{item.symbol}</span>}
                    {item.isSponsored && <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-slate-400">{Math.floor(item.score || 0).toLocaleString()} pts</span>
                    <span className={cn(
                        "text-[10px] font-black tracking-wide",
                        (item.velocity || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                        {(item.velocity || 0) >= 0 ? '▲' : '▼'} {Math.abs(item.velocity || 0).toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Vote buttons — large touch targets */}
            <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => vote(item.id, 1)}
                    className={cn(
                        "min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors",
                        currentVote === 'up' ? "bg-emerald-500 text-slate-950" : "bg-emerald-500/10 text-emerald-400 active:bg-emerald-500/30"
                    )}
                >
                    <ChevronUp size={20} strokeWidth={3} />
                </button>
                <div className="relative">
                    <button
                        onClick={() => vote(item.id, -1)}
                        className={cn(
                            "min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors",
                            currentVote === 'down' ? "bg-rose-500 text-white" : "bg-rose-500/10 text-rose-400 active:bg-rose-500/30"
                        )}
                    >
                        <ChevronDown size={20} strokeWidth={3} />
                    </button>
                    {user?.powerVotes > 0 && (
                        <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0D1B2A] border border-[#C9A84C]/50 flex items-center justify-center shadow-lg">
                            <Zap size={8} className="text-[#C9A84C] fill-[#C9A84C] animate-pulse" />
                        </div>
                    )}
                </div>
            </div>

            {/* Stake CTA */}
            <button
                onClick={(e) => { e.stopPropagation(); openModal('stake', item); }}
                className="min-h-[44px] px-3.5 rounded-xl bg-[#C9A84C] text-[#0D1B2A] shadow-[0_4px_12px_rgba(201,168,76,0.2)] font-black text-[10px] uppercase tracking-widest flex-shrink-0 active:scale-95 transition-all flex items-center"
            >
                STAKE
            </button>
        </motion.div>
    );
}

function Sparkline({ data, color }) {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 48;
    const height = 12;

    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible shrink-0">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="opacity-50"
            />
        </svg>
    );
}
