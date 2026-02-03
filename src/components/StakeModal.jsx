import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowUpRight, ShieldAlert, BadgeDollarSign, Target } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export function StakeModal({ isOpen, onClose, itemId, itemName }) {
    const { balance, placeStake } = useStore();
    const [amount, setAmount] = useState('');
    const [targetRank, setTargetRank] = useState('1');
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock odds calculation based on target rank
    const odds = (4 / parseInt(targetRank || 1)).toFixed(2);
    const potentialPayout = (parseFloat(amount || 0) * odds).toFixed(2);

    const handleStake = async () => {
        if (!amount || parseFloat(amount) <= 0) return;
        if (parseFloat(amount) > balance) return;

        setIsProcessing(true);
        const success = await placeStake(itemId, parseFloat(amount), parseInt(targetRank));
        setIsProcessing(false);

        if (success) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Deploy Stake</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Market Influence Layer</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Item Context */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Market Item</div>
                        <div className="text-xl font-black text-white uppercase">{itemName}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <BadgeDollarSign size={12} /> Stake Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-sm font-mono font-black text-white focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Target size={12} /> Target Rank
                            </label>
                            <select
                                value={targetRank}
                                onChange={(e) => setTargetRank(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono font-black text-white focus:outline-none focus:ring-1 focus:ring-brand-accent appearance-none cursor-pointer"
                            >
                                <option value="1">Rank #1</option>
                                <option value="3">Top 3</option>
                                <option value="5">Top 5</option>
                                <option value="10">Top 10</option>
                            </select>
                        </div>
                    </div>

                    {/* Odds Display */}
                    <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800 flex justify-between items-center">
                        <div>
                            <div className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Estimated Payout</div>
                            <div className="text-xl font-mono font-black text-emerald-400">${potentialPayout}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Implied Odds</div>
                            <div className="text-sm font-mono font-black text-slate-200">x{odds}</div>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 items-start">
                        <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-medium text-amber-500/80 leading-relaxed uppercase">
                            Warning: Stakes are locked until the market epoch completes. Loss of capital is possible if the item fails to reach the target rank.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-2xl border border-slate-800 text-[10px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-850 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStake}
                        disabled={isProcessing || !amount || parseFloat(amount) > balance}
                        className={cn(
                            "flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2",
                            parseFloat(amount) > balance
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 cursor-not-allowed"
                                : "bg-emerald-500 text-slate-950 hover:bg-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                        )}
                    >
                        {isProcessing ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                <Zap size={14} fill="currentColor" />
                            </motion.div>
                        ) : (
                            <>
                                <ArrowUpRight size={14} />
                                {parseFloat(amount) > balance ? 'Insufficient Balance' : 'Confirm Stake'}
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
