import React from 'react';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, Zap, ChevronUp, ChevronDown, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export function RankingTable() {
    const navigate = useNavigate();
    const {
        getFilteredItems,
        vote,
        userVotes,
        openModal
    } = useStore();

    const items = getFilteredItems();

    const Row = ({ index, style }) => {
        const item = items[index];
        const currentVote = userVotes[item.id];

        return (
            <div style={style} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group cursor-pointer flex items-center px-6" onClick={() => navigate(`/market/${item.id}`)}>
                {/* Rank column */}
                <div className="w-20 shrink-0 text-center">
                    <span className={cn(
                        "font-mono text-base font-black italic",
                        index === 0 ? "text-amber-400" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-700" : "text-slate-600"
                    )}>
                        #{index + 1}
                    </span>
                </div>

                {/* Oracle Context column */}
                <div className="flex-1 flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-brand-accent/30 transition-all overflow-hidden relative shrink-0">
                        {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                        ) : (
                            <Star size={16} className="text-slate-800" />
                        )}
                        {index === 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-bl flex items-center justify-center"><Star size={6} fill="black" /></div>}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-black text-white uppercase tracking-tight text-xs truncate">{item.name}</span>
                            {item.isDampened && (
                                <div className="group/damp relative flex items-center justify-center">
                                    <ShieldAlert size={10} className="text-brand-accent animate-pulse shrink-0" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[7px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/damp:opacity-100 pointer-events-none transition-all z-10">
                                        Whale Pressure Dampened
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest shrink-0">Vol: {item.totalVotes.toLocaleString()}</span>
                            <div className="w-12 h-3 grayscale group-hover:grayscale-0 transition-all">
                                <Sparkline data={item.trend} color={item.velocity >= 0 ? "#10b981" : "#ef4444"} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Score column */}
                <div className="w-32 shrink-0 text-right">
                    <span className="font-mono text-xs font-black text-slate-100 italic">
                        {item.score.toLocaleString()}
                    </span>
                </div>

                {/* Velocity column */}
                <div className="w-32 shrink-0 text-right pr-4">
                    <div className={cn(
                        "inline-flex items-center gap-1 font-mono text-[9px] font-black px-2 py-0.5 rounded-lg",
                        item.velocity >= 0
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                    )}>
                        {item.velocity >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(item.velocity).toFixed(1)}%
                    </div>
                </div>

                {/* Operations column */}
                <div className="w-44 shrink-0 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                        <button
                            onClick={() => vote(item.id, 1)}
                            className={cn(
                                "w-7 h-7 rounded flex items-center justify-center transition-all",
                                currentVote === 'up'
                                    ? "bg-brand-accent text-slate-950"
                                    : "text-slate-600 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <ChevronUp size={16} strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => vote(item.id, -1)}
                            className={cn(
                                "w-7 h-7 rounded flex items-center justify-center transition-all",
                                currentVote === 'down'
                                    ? "bg-rose-500 text-white"
                                    : "text-slate-600 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <ChevronDown size={16} strokeWidth={3} />
                        </button>
                    </div>

                    <button
                        onClick={() => openModal('stake', item)}
                        className="h-8 px-3 rounded-lg bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-1.5"
                    >
                        <Zap size={12} fill="currentColor" />
                        Stake
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-[600px] border border-slate-800 rounded-3xl bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="flex items-center px-6 py-4 bg-slate-950/50 border-b border-slate-800 shrink-0">
                <div className="w-20 shrink-0 text-center font-black text-[9px] text-slate-500 uppercase tracking-widest">Rank</div>
                <div className="flex-1 font-black text-[9px] text-slate-500 uppercase tracking-widest">Oracle Context</div>
                <div className="w-32 shrink-0 text-right font-black text-[9px] text-slate-500 uppercase tracking-widest">Score</div>
                <div className="w-32 shrink-0 text-right pr-4 font-black text-[9px] text-slate-500 uppercase tracking-widest">Velocity</div>
                <div className="w-44 shrink-0 text-center font-black text-[9px] text-slate-500 uppercase tracking-widest">Operations</div>
            </div>

            {/* Virtualized List Container */}
            <div className="flex-1 min-h-0 bg-slate-900/50">
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            height={height}
                            itemCount={items.length}
                            itemSize={72}
                            width={width}
                            className="custom-scrollbar"
                        >
                            {Row}
                        </List>
                    )}
                </AutoSizer>
            </div>

            {/* Virtualization Info (Debug/Feedback) */}
            <div className="px-6 py-2 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-widest">
                <span>Rendering {items.length} Units in Real-time</span>
                <span className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    Oracle Virtualization Active
                </span>
            </div>
        </div>
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
        <svg width={width} height={height} className="overflow-visible">
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
