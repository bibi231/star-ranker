import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Zap, ArrowUpRight, ShieldAlert,
    BadgeDollarSign, Target, Lock,
    TrendingUp, Activity, AlertTriangle,
    ChevronDown, Info
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import debounce from 'lodash-es/debounce';

export function StakeModal({ isOpen, onClose, itemId, itemName }) {
    const { balance, placeStake, getLiveOdds, currentEpoch, serverTimeOffset } = useStore();
    const [amount, setAmount] = useState('10');
    const [betType, setBetType] = useState('exact'); // exact, range, directional
    const [targetRank, setTargetRank] = useState('1');
    const [rangeMin, setRangeMin] = useState('1');
    const [rangeMax, setRangeMax] = useState('10');
    const [direction, setDirection] = useState('up');
    const [kPositions, setKPositions] = useState('5');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [quote, setQuote] = useState(null);
    const [loadingQuote, setLoadingQuote] = useState(false);

    // 1. Fetch Live Odds (Debounced)
    const fetchQuote = useCallback(
        debounce(async (amt, type, tRank, rMin, rMax, dir, k) => {
            if (!amt || parseFloat(amt) <= 0) return;
            setLoadingQuote(true);
            const target = type === 'exact' ? tRank : type === 'range' ? { min: rMin, max: rMax } : { dir, k };
            const data = await getLiveOdds(itemId, parseFloat(amt), target, type);
            if (data) setQuote(data);
            setLoadingQuote(false);
        }, 500),
        [itemId, getLiveOdds]
    );

    useEffect(() => {
        if (isOpen && amount) {
            fetchQuote(amount, betType, targetRank, rangeMin, rangeMax, direction, kPositions);
        }
    }, [isOpen, amount, betType, targetRank, rangeMin, rangeMax, direction, kPositions, fetchQuote]);

    // 2. Epoch Lock Timer
    useEffect(() => {
        if (!currentEpoch) return;

        const checkLock = () => {
            const nowServer = Date.now() + serverTimeOffset;
            const remaining = Math.max(0, currentEpoch.endTime - nowServer);
            setIsLocked(remaining <= 60000); // 60s lock
        };

        checkLock();
        const timer = setInterval(checkLock, 1000);
        return () => clearInterval(timer);
    }, [currentEpoch, serverTimeOffset]);

    const handleStake = async () => {
        if (!amount || parseFloat(amount) <= 0) return;
        if (parseFloat(amount) > balance) return;

        setIsProcessing(true);
        const target = betType === 'exact' ? parseInt(targetRank) : betType === 'range' ? { min: parseInt(rangeMin), max: parseInt(rangeMax) } : { dir: direction, k: parseInt(kPositions) };
        const success = await placeStake(itemId, parseFloat(amount), target, itemName, betType);
        setIsProcessing(false);

        if (success) {
            onClose();
        }
    };

    if (!isOpen) return null;

    const riskLevel = quote?.probability > 0.4 ? 'Low' : quote?.probability > 0.15 ? 'Medium' : 'High';
    const riskColor = riskLevel === 'Low' ? 'text-emerald-400' : riskLevel === 'Medium' ? 'text-amber-400' : 'text-rose-400';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden"
            >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Quantum Stake</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">DMAO protocol active</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8">
                    {/* Item Context */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity" />
                        <div className="relative p-6 rounded-3xl bg-slate-950 border border-white/5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Market Item</div>
                                <div className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border", riskColor, riskLevel === 'High' ? 'border-rose-500/30 bg-rose-500/10' : 'border-current/30')}>
                                    {riskLevel} Risk
                                </div>
                            </div>
                            <div className="text-3xl font-black text-white uppercase tracking-tighter truncate">{itemName}</div>
                        </div>
                    </div>

                    {/* Bet Type Selector */}
                    <div className="flex p-1 bg-slate-950 rounded-2xl border border-white/5">
                        {['exact', 'range', 'directional'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setBetType(t)}
                                className={cn(
                                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                    betType === t ? "bg-emerald-500 text-slate-950 shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                <BadgeDollarSign size={12} className="text-emerald-500" /> Stake Capital
                            </label>
                            <div className="relative group">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg font-black">$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-10 pr-4 py-4 text-xl font-mono font-black text-white focus:outline-none focus:border-emerald-500/50 focus:bg-slate-900 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {betType === 'exact' && (
                                <>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                        <Target size={12} className="text-blue-500" /> Pred. Rank
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={targetRank}
                                            onChange={(e) => setTargetRank(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-xl font-mono font-black text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer shadow-inner"
                                        >
                                            {[1, 2, 3, 5, 10, 25, 50].map(r => (
                                                <option key={r} value={r}>#{r}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
                                    </div>
                                </>
                            )}

                            {betType === 'range' && (
                                <>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                        <Activity size={12} className="text-amber-500" /> Rank Range
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            value={rangeMin}
                                            onChange={(e) => setRangeMin(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl px-3 py-4 text-sm font-mono font-black text-white text-center"
                                            placeholder="Min"
                                        />
                                        <span className="text-slate-700">-</span>
                                        <input
                                            type="number"
                                            value={rangeMax}
                                            onChange={(e) => setRangeMax(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl px-3 py-4 text-sm font-mono font-black text-white text-center"
                                            placeholder="Max"
                                        />
                                    </div>
                                </>
                            )}

                            {betType === 'directional' && (
                                <>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                        <ArrowUpRight size={12} className="text-rose-500" /> Displacement
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setDirection('up')}
                                            className={cn("flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border", direction === 'up' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-white/5 text-slate-600')}
                                        >
                                            UP
                                        </button>
                                        <button
                                            onClick={() => setDirection('down')}
                                            className={cn("flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border", direction === 'down' ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-white/5 text-slate-600')}
                                        >
                                            DOWN
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        value={kPositions}
                                        onChange={(e) => setKPositions(e.target.value)}
                                        className="w-full mt-2 bg-slate-950 border border-white/5 rounded-2xl px-4 py-2 text-center text-xs font-mono font-black text-white"
                                        placeholder="±K Positions"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* DMAO Odds Core */}
                    <div className="relative p-6 rounded-3xl bg-slate-950 border border-white/5 overflow-hidden">
                        {loadingQuote && (
                            <div className="absolute inset-0 bg-slate-950/80 z-10 flex items-center justify-center backdrop-blur-sm">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                    <Activity className="text-emerald-500" />
                                </motion.div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-8 relative z-0">
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="text-[9px] font-black text-slate-500 uppercase">Implied Probability</div>
                                        <Info size={10} className="text-slate-700" title="Likelihood of reaching target based on momentum and velocity." />
                                    </div>
                                    <div className="text-2xl font-mono font-black text-white">
                                        {quote ? (quote.probability * 100).toFixed(1) : '--'}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Base Multiplier</div>
                                    <div className="text-xl font-mono font-black text-slate-400 uppercase italic">
                                        x{quote ? quote.multiplier.toFixed(2) : '--'}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 text-right">
                                <div>
                                    <div className="text-[9px] font-black text-emerald-500/50 uppercase mb-1">Potential Payout</div>
                                    <div className="text-3xl font-mono font-black text-emerald-400 drop-shadow-lg">
                                        ${quote ? (parseFloat(amount || 0) * quote.effectiveMultiplier).toFixed(2) : '0.00'}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-end gap-1.5 mb-1">
                                        <div className="text-[9px] font-black text-rose-500/50 uppercase">Whale Dampening</div>
                                        <ShieldAlert size={10} className="text-rose-500/50" />
                                    </div>
                                    <div className="text-sm font-mono font-black text-rose-500">
                                        -{quote ? (quote.slippage * 100).toFixed(1) : '0.0'}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visual Progress Bar for Probability */}
                        <div className="mt-6 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: quote ? `${quote.probability * 100}%` : 0 }}
                                className={cn("h-full", quote?.probability > 0.4 ? 'bg-emerald-500' : quote?.probability > 0.15 ? 'bg-amber-500' : 'bg-rose-500')}
                            />
                        </div>
                    </div>

                    {/* System Status / Warnings */}
                    <AnimatePresence mode="wait">
                        {isLocked ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex gap-4 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20"
                            >
                                <Lock size={18} className="text-rose-500 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Epoch Lockdown</p>
                                    <p className="text-[10px] font-bold text-rose-400/80 leading-relaxed uppercase italic">
                                        Snapshots in progress. Market entries paused for rollover integrity.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-4 p-5 rounded-2xl bg-slate-950 border border-white/5"
                            >
                                <AlertTriangle size={18} className="text-slate-600 shrink-0" />
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">
                                    DMAO quotes are real-time and sensitive to market liquidity. Final payout determined at epoch boundary based on rank reification.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="p-8 pt-0 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-5 rounded-2xl border border-white/5 text-[10px] font-black uppercase text-slate-500 hover:text-white hover:bg-white/5 transition-all outline-none"
                    >
                        Abort
                    </button>
                    <button
                        onClick={handleStake}
                        disabled={isProcessing || isLocked || !amount || parseFloat(amount) > balance || loadingQuote}
                        className={cn(
                            "flex-[2.5] py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group outline-none",
                            isLocked
                                ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                : parseFloat(amount) > balance
                                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 cursor-not-allowed"
                                    : "bg-emerald-500 text-slate-950 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                        )}
                    >
                        {isProcessing ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                <Zap size={18} fill="currentColor" />
                            </motion.div>
                        ) : (
                            <>
                                <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                {parseFloat(amount) > balance ? 'Insufficient Balance' : 'Protocol Entry'}
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
