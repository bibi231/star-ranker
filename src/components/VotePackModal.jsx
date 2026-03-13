import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { apiGet, apiPost } from '../lib/api';

export function VotePackModal({ isOpen, onClose }) {
    const { balance, formatValue, refreshUser } = useStore();
    const [packs, setPacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadPacks();
            setError('');
            setSuccessMessage('');
        }
    }, [isOpen]);

    const loadPacks = async () => {
        setIsLoading(true);
        try {
            const data = await apiGet('/api/vote-packs');
            setPacks(data || []);
        } catch (err) {
            setError('Failed to load vote packs.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async (pack) => {
        const costUsd = pack.priceNgn / 1500;
        if (balance < costUsd) {
            setError('Insufficient funds. Please fund your wallet.');
            return;
        }

        setError('');
        setIsPurchasing(true);
        try {
            const res = await apiPost('/api/vote-packs/purchase', { packId: pack.id });
            await refreshUser(); // Update balance and powerVotes
            setSuccessMessage(`Successfully purchased ${pack.name} Pack!`);
            setTimeout(() => {
                setSuccessMessage('');
                onClose();
            }, 2500);
        } catch (err) {
            setError(err.message || 'Purchase failed.');
        } finally {
            setIsPurchasing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-slate-900 border border-brand-accent/30 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50 backdrop-blur-md relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Zap size={20} className="text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter">Power Votes</h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">3x Momentum Multiplier</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-slate-800/50 text-slate-400 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative z-10">
                        <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">
                            Supercharge your influence. Power Votes apply an immediate <strong className="text-amber-500">3x multiplier</strong> to your vote's momentum, helping your favourite items climb faster.
                        </p>

                        {error && (
                            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500">
                                <AlertCircle size={18} className="shrink-0" />
                                <p className="text-xs font-black uppercase tracking-wide">{error}</p>
                            </div>
                        )}

                        {successMessage && (
                            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-500">
                                <CheckCircle size={18} className="shrink-0" />
                                <p className="text-xs font-black uppercase tracking-wide">{successMessage}</p>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="animate-spin text-amber-500" size={32} />
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {packs.map((pack) => (
                                    <div key={pack.id} className="p-4 rounded-2xl border border-slate-700 bg-slate-800/30 flex items-center justify-between group hover:border-amber-500/50 hover:bg-slate-800/80 transition-all">
                                        <div>
                                            <h3 className="text-base font-black text-white uppercase tracking-wide group-hover:text-amber-500 transition-colors">{pack.name} Pack</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                <Zap size={12} className="inline mr-1 text-amber-500" />
                                                {pack.votes} Power Votes
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handlePurchase(pack)}
                                            disabled={isPurchasing}
                                            className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {formatValue(pack.priceNgn / 1500)}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
