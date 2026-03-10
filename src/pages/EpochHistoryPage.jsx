import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiGet } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Search, ChevronRight, Calendar, Box, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';

export default function EpochHistoryPage() {
    const { categories } = useStore();
    const [epochs, setEpochs] = useState([]);
    const [selectedEpoch, setSelectedEpoch] = useState(null);
    const [snapshots, setSnapshots] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id);

    useEffect(() => {
        fetchEpochs();
    }, []);

    useEffect(() => {
        if (selectedEpoch) {
            fetchSnapshots(selectedEpoch.epochNumber || selectedEpoch.epochId);
        }
    }, [selectedEpoch, selectedCategory]);

    const fetchEpochs = async () => {
        setIsLoading(true);
        try {
            // For now, fetch current epoch — full history would need a dedicated endpoint
            const epoch = await apiGet("/api/epochs/current");
            const epochData = epoch ? [epoch] : [];
            setEpochs(epochData);
            if (epochData.length > 0) setSelectedEpoch(epochData[0]);
        } catch (error) {
            console.error("Error fetching epochs:", error);
        }
        setIsLoading(false);
    };

    const fetchSnapshots = async (epochId) => {
        // Snapshots not yet implemented in the Express API
        // Will be populated once the ranking engine runs
        setSnapshots([]);
    };


    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <History size={32} className="text-brand-accent" />
                        Historical Archive
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">
                        Immutable market snapshots for all processed epochs.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Epoch List */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Recent Epochs</div>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                        {epochs.map(epoch => (
                            <button
                                key={epoch.id}
                                onClick={() => setSelectedEpoch(epoch)}
                                className={clsx(
                                    "w-full p-4 rounded-2xl border transition-all text-left group relative overflow-hidden",
                                    selectedEpoch?.epochId === epoch.epochId
                                        ? "bg-brand-accent/10 border-brand-accent/30 text-white"
                                        : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                                )}
                            >
                                <div className="flex justify-between items-center relative z-10">
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-tighter opacity-70">
                                            {new Date(epoch.startTime).toLocaleDateString()}
                                        </div>
                                        <div className="text-lg font-black uppercase tracking-tight">Epoch #{epoch.epochId}</div>
                                    </div>
                                    <ChevronRight size={16} className={clsx(
                                        "transition-transform",
                                        selectedEpoch?.epochId === epoch.epochId ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                                    )} />
                                </div>
                                {selectedEpoch?.epochId === epoch.epochId && (
                                    <motion.div layoutId="activeEpoch" className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Snapshot Details */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={clsx(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                                    selectedCategory === cat.id
                                        ? "bg-white text-slate-950 border-white shadow-lg"
                                        : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
                                )}
                            >
                                {cat.title}
                            </button>
                        ))}
                    </div>

                    {/* Rankings Table */}
                    <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Activity size={16} className="text-brand-accent" />
                                Snapshot Rankings
                            </h2>
                            {selectedEpoch && (
                                <div className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/20">
                                    Verified Snapshot • Epoch #{selectedEpoch.epochId}
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Market Item</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Momentum Score</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Velocity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/30">
                                    {snapshots.length > 0 ? snapshots.map((item, idx) => (
                                        <tr key={item.itemId} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className={clsx(
                                                        "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black",
                                                        idx === 0 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"
                                                    )}>
                                                        {idx + 1}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-black text-white uppercase group-hover:text-brand-accent transition-colors">{item.name}</div>
                                                <div className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">{item.itemId}</div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="text-sm font-mono font-bold text-slate-200">{Math.round(item.score).toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className={clsx(
                                                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black font-mono border",
                                                    item.velocity > 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                )}>
                                                    {item.velocity > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                                                    {Math.abs(item.velocity).toFixed(2)}v
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-30 grayscale saturate-0">
                                                    <Box size={40} className="text-slate-600" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No snapshot records found for this category</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="p-6 rounded-3xl bg-brand-accent/5 border border-brand-accent/20 flex gap-4 items-start">
                        <div className="p-2 rounded-xl bg-brand-accent/20 text-brand-accent">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Immutability Protocol</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed italic">
                                All snapshots are cryptographically tied to their Epoch ID at the moment of rollover. This data is server-authoritative and used as the final source of truth for all staking settlements and reputation rewards.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const ShieldCheck = ({ size, className }) => (
    <Activity size={size} className={className} />
);
