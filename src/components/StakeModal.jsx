import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Zap, ArrowUpRight, ShieldAlert,
    BadgeDollarSign, Target, Lock,
    TrendingUp, Activity, AlertTriangle,
    ChevronDown, Info
} from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';
import debounce from 'lodash-es/debounce';
import { useIsMobile } from '../hooks/useIsMobile';

export function StakeModal({ isOpen, onClose, itemId, itemName }) {
    const { balance, placeStake, getLiveOdds, currentEpoch, serverTimeOffset, formatValue, currency } = useStore();
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
    const [error, setError] = useState(null);
    const [viewportHeight, setViewportHeight] = useState('100vh');
    const isMobile = useIsMobile();

    // iOS Safari keyboard fix
    useEffect(() => {
        if (!isMobile || !isOpen) return;
        const vv = window.visualViewport;
        if (!vv) return;

        const handler = () => setViewportHeight(`${vv.height}px`);
        vv.addEventListener('resize', handler);
        handler(); // init

        return () => vv.removeEventListener('resize', handler);
    }, [isMobile, isOpen]);

    // Scroll Lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (isMobile) {
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
            }
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, [isOpen, isMobile]);

    // 1. Fetch Live Odds (Debounced)
    const fetchQuote = useCallback(
        debounce(async (amt, type, tRank, rMin, rMax, dir, k) => {
            if (!amt || parseFloat(amt) <= 0) return;
            const parsedUsdAmount = useStore.getState().parseLocalToUSD(amt);
            setLoadingQuote(true);
            const target = type === 'exact' ? tRank : type === 'range' ? { min: rMin, max: rMax } : { dir, k };
            const data = await getLiveOdds(itemId, parsedUsdAmount, target, type);
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
        const usdAmount = useStore.getState().parseLocalToUSD(amount);

        if (usdAmount > balance) {
            setError("Insufficient balance for this stake.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        try {
            const target = betType === 'exact' ? parseInt(targetRank) : betType === 'range' ? { min: parseInt(rangeMin), max: parseInt(rangeMax) } : { dir: direction, k: parseInt(kPositions) };
            const response = await placeStake(itemId, usdAmount, target, itemName, betType);

            if (response.success) {
                onClose();
            } else {
                setError(response.error || "Transaction failed. Please try again.");
            }
        } catch (err) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const riskLevel = quote?.probability > 0.4 ? 'Low' : quote?.probability > 0.15 ? 'Medium' : 'High';
    const riskColor = riskLevel === 'Low' ? 'text-emerald-400' : riskLevel === 'Medium' ? 'text-amber-400' : 'text-rose-400';

    // Extract the shared body and footer content
    const ModalContent = (
        <div className="flex flex-col">
            {/* Body */}
            <div className="p-6 md:p-8 space-y-8 flex-1">
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
                                "flex-1 py-3 md:py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all touch-target",
                                betType === t ? "bg-emerald-500 text-slate-950 shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                            <BadgeDollarSign size={12} className="text-emerald-500" /> Stake Capital
                        </label>
                        <div className="relative group">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg font-black">{currency === 'NGN' ? '₦' : currency === 'EUR' ? '€' : '$'}</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-10 pr-4 py-4 text-xl font-mono font-black text-white focus:outline-none focus:border-emerald-500/50 focus:bg-slate-900 transition-all shadow-inner touch-target"
                            />
                        </div>
                        {/* Quick preset amounts */}
                        <div className="flex gap-2 pt-1 md:hidden">
                            {[10, 50, 250, 1000].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setAmount(String(v))}
                                    className={cn(
                                        "flex-1 py-1 rounded-xl text-[10px] font-black uppercase border transition-all touch-target",
                                        parseFloat(amount) === v
                                            ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10"
                                            : "border-white/5 text-slate-500 hover:text-white"
                                    )}
                                >
                                    {currency === 'NGN' ? '₦' : currency === 'EUR' ? '€' : '$'}{v >= 1000 ? `${v / 1000}K` : v}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {betType === 'exact' && (
                            <>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                    <Target size={12} className="text-blue-500" /> Pred. Rank
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        value={targetRank}
                                        min="1"
                                        max="1000"
                                        onChange={(e) => setTargetRank(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-10 pr-4 py-4 text-xl font-mono font-black text-white focus:outline-none focus:border-blue-500/50 shadow-inner touch-target"
                                        placeholder="Target #"
                                    />
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg font-black">#</span>
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
                                        inputMode="numeric"
                                        value={rangeMin}
                                        onChange={(e) => setRangeMin(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-3 py-4 text-sm font-mono font-black text-white text-center touch-target"
                                        placeholder="Min"
                                    />
                                    <span className="text-slate-700">-</span>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        value={rangeMax}
                                        onChange={(e) => setRangeMax(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-3 py-4 text-sm font-mono font-black text-white text-center touch-target"
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
                                        className={cn("flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border touch-target", direction === 'up' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-white/5 text-slate-600')}
                                    >
                                        UP
                                    </button>
                                    <button
                                        onClick={() => setDirection('down')}
                                        className={cn("flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border touch-target", direction === 'down' ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-white/5 text-slate-600')}
                                    >
                                        DOWN
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    value={kPositions}
                                    onChange={(e) => setKPositions(e.target.value)}
                                    className="w-full mt-2 bg-slate-950 border border-white/5 rounded-2xl px-4 py-3 text-center text-xs font-mono font-black text-white touch-target"
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

                    <div className="grid grid-cols-2 gap-4 md:gap-8 relative z-0">
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="text-[9px] font-black text-slate-500 uppercase">Implied Probability</div>
                                    <Info size={10} className="text-slate-700 hidden md:inline-block" title="Likelihood of reaching target based on momentum and velocity." />
                                </div>
                                <div className="text-xl md:text-2xl font-mono font-black text-white">
                                    {quote ? (quote.probability * 100).toFixed(1) : '--'}%
                                </div>
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Base Multiplier</div>
                                <div className="text-lg md:text-xl font-mono font-black text-slate-400 uppercase italic">
                                    x{quote ? quote.multiplier.toFixed(2) : '--'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 text-right">
                            <div>
                                <div className="text-[9px] font-black text-emerald-500/50 uppercase mb-1">Potential Payout</div>
                                <div className="text-2xl md:text-3xl font-mono font-black text-emerald-400 drop-shadow-lg">
                                    {formatValue(quote ? (useStore.getState().parseLocalToUSD(amount || 0) * quote.effectiveMultiplier) : 0)}
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

                    {/* Fee Breakdown */}
                    <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-500">Stake Amount</span>
                            <span className="text-white">{formatValue(useStore.getState().parseLocalToUSD(amount))}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-rose-400">Platform Fee (5%)</span>
                            <span className="text-rose-400">-{formatValue(useStore.getState().parseLocalToUSD(amount) * 0.05)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-400">Net at Risk</span>
                            <span className="text-emerald-400">{formatValue(useStore.getState().parseLocalToUSD(amount) * 0.95)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-2">
                            <Info size={10} className="text-amber-500/60 shrink-0" />
                            <span className="text-[8px] text-amber-500/60 font-bold uppercase leading-tight">
                                Est. payout is variable — final amount depends on pool size at epoch end
                            </span>
                        </div>
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
                                    Snapshots in progress. Market entries paused.
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
                                Quotes are real-time. Final payout based on rank reification.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error Feedback */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex gap-3 items-start"
                        >
                            <ShieldAlert className="text-rose-500 shrink-0 mt-0.5" size={16} />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Protocol Error</p>
                                <p className="text-[10px] font-bold text-rose-400/80 uppercase">{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Controls */}
            <div className="p-6 md:p-8 pt-0 flex gap-4 shrink-0 mb-8 md:mb-0">
                <button
                    onClick={onClose}
                    className="flex-1 min-h-[56px] py-4 rounded-3xl border border-white/5 text-[10px] font-black uppercase text-slate-500 hover:text-white hover:bg-white/5 transition-all outline-none active:scale-[0.97]"
                >
                    Abort
                </button>
                <button
                    onClick={handleStake}
                    disabled={isProcessing || isLocked || !amount || useStore.getState().parseLocalToUSD(amount) > balance || loadingQuote}
                    className={cn(
                        "flex-[2.5] min-h-[56px] py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group outline-none",
                        isLocked
                            ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                            : useStore.getState().parseLocalToUSD(amount) > balance
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 cursor-not-allowed"
                                : "bg-[#C9A84C] text-[#0D1B2A] hover:shadow-[0_0_30px_rgba(201,168,76,0.4)] active:scale-[0.98]"
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
        </div>
    );

    if (isMobile) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-[101] bg-[#0D1B2A] rounded-t-[2.5rem] border-t border-[#C9A84C]/30 overflow-y-auto"
                            style={{
                                height: 'auto',
                                maxHeight: `calc(${viewportHeight} * 0.95)`,
                                paddingBottom: 'calc(var(--safe-bottom) + 16px)'
                            }}
                        >
                            <div className="flex justify-center pt-3 pb-2 w-full sticky top-0 bg-[#0D1B2A] z-10 border-b border-white/5 shadow-md">
                                <div className="w-12 h-1.5 rounded-full bg-white/20" />
                            </div>
                            <div className="p-6 pb-2 flex justify-between items-center sticky top-5 bg-[#0D1B2A] z-10">
                                <div className="flex items-center gap-3">
                                    <div className="text-[#C9A84C]">
                                        <TrendingUp size={24} />
                                    </div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Quantum Stake</h2>
                                </div>
                                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full touch-target">
                                    <X size={20} />
                                </button>
                            </div>
                            {ModalContent}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 40 }}
                        className="relative w-full max-w-lg bg-[#0D1B2A] border border-slate-800 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh] mx-4"
                        style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
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

                        {ModalContent}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
