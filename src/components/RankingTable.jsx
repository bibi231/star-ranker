import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, Zap, ChevronUp, ChevronDown } from 'lucide-react';
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

    return (
        <div className="w-full overflow-hidden border border-slate-800 rounded-3xl bg-slate-900 shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800">
                            <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-[0.2em] w-20 text-center">Rank</th>
                            <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-[0.2em]">Oracle Context</th>
                            <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-[0.2em] text-right">Score</th>
                            <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-[0.2em] text-right">Velocity</th>
                            <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-[0.2em] text-center w-40">Influence Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        <AnimatePresence initial={false} mode="popLayout">
                            {items.map((item, index) => {
                                const currentVote = userVotes[item.id];

                                return (
                                    <motion.tr
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        className="hover:bg-slate-800/30 group cursor-pointer transition-colors"
                                        onClick={() => navigate(`/market/${item.id}`)}
                                    >
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={cn(
                                                    "font-mono text-base font-black italic",
                                                    index === 0 ? "text-amber-400" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-700" : "text-slate-600"
                                                )}>
                                                    #{index + 1}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-brand-accent/30 transition-all overflow-hidden relative">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                                                    ) : (
                                                        <Star size={20} className="text-slate-800" />
                                                    )}
                                                    {index === 0 && <div className="absolute top-0 right-0 w-4 h-4 bg-amber-400 rounded-bl-lg flex items-center justify-center"><Star size={8} fill="black" /></div>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white uppercase tracking-tight text-sm">{item.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Vol: {item.totalVotes.toLocaleString()}</span>
                                                        <div className="w-16 h-4">
                                                            <Sparkline data={item.trend} color={item.velocity >= 0 ? "#10b981" : "#ef4444"} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-5 text-right">
                                            <span className="font-mono text-sm font-black text-slate-100 italic">
                                                {item.score.toLocaleString()}
                                            </span>
                                        </td>

                                        <td className="px-6 py-5 text-right">
                                            <div className={cn(
                                                "inline-flex items-center gap-1 font-mono text-[10px] font-black px-2 py-1 rounded-lg",
                                                item.velocity >= 0
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-rose-500/10 text-rose-400"
                                            )}>
                                                {item.velocity >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {Math.abs(item.velocity).toFixed(2)}%
                                            </div>
                                        </td>

                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                {/* Core Rank Tools */}
                                                <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
                                                    <button
                                                        onClick={() => vote(item.id, 1)}
                                                        className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                            currentVote === 'up'
                                                                ? "bg-brand-accent text-slate-950 shadow-lg shadow-brand-accent/20"
                                                                : "text-slate-600 hover:text-white hover:bg-slate-800"
                                                        )}
                                                    >
                                                        <ChevronUp size={18} strokeWidth={3} />
                                                    </button>
                                                    <button
                                                        onClick={() => vote(item.id, -1)}
                                                        className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                            currentVote === 'down'
                                                                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                                                : "text-slate-600 hover:text-white hover:bg-slate-800"
                                                        )}
                                                    >
                                                        <ChevronDown size={18} strokeWidth={3} />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => openModal('stake', item)}
                                                    className="h-10 px-4 rounded-xl bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                                >
                                                    <Zap size={14} fill="currentColor" />
                                                    Stake
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Minimal Sparkline for Table Depth
function Sparkline({ data, color }) {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 16;

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
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="opacity-50"
            />
        </svg>
    );
}
