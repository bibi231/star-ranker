import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Zap, TrendingUp, TrendingDown, Wallet, User, ExternalLink, Loader2, Clock } from 'lucide-react';
import { apiGet } from '../lib/api';
import { cn } from '../lib/utils';
import { useIsMobile } from '../hooks/useIsMobile';

export function ActivityLogModal({ isOpen, onClose }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const isMobile = useIsMobile();

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            apiGet('/api/activity')
                .then(data => setActivities(Array.isArray(data) ? data : []))
                .catch(err => console.error('Failed to fetch activity:', err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'stake': return <Zap size={14} className="text-emerald-400" />;
            case 'win': return <TrendingUp size={14} className="text-brand-accent" />;
            case 'loss': return <TrendingDown size={14} className="text-rose-400" />;
            case 'deposit': return <Wallet size={14} className="text-amber-400" />;
            case 'withdrawal': return <ExternalLink size={14} className="text-sky-400" />;
            default: return <Clock size={14} className="text-slate-500" />;
        }
    };

    const getRelativeTime = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(date).toLocaleDateString();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                />

                <motion.div
                    initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                    className={cn(
                        "relative w-full max-w-2xl bg-slate-900 border border-slate-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden",
                        isMobile ? "fixed bottom-0 left-0 right-0 rounded-t-[2.5rem] h-[85vh]" : "rounded-[2.5rem] max-h-[80vh]"
                    )}
                >
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50 sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-brand-accent/10 text-brand-accent shadow-[0_0_20px_rgba(56,189,248,0.1)]">
                                <History size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Influence Archive</h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Real-time Oracle Event Stream</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="overflow-y-auto p-6 md:p-10 h-full custom-scrollbar pb-32">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                <Loader2 size={32} className="text-brand-accent animate-spin" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Synchronizing Ledger...</p>
                            </div>
                        ) : activities.length > 0 ? (
                            <div className="space-y-6">
                                {activities.map((act, i) => (
                                    <motion.div 
                                        key={act.id || i}
                                        initial={{ x: -10, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex gap-6 items-start group"
                                    >
                                        <div className={cn(
                                            "mt-1 p-2 rounded-xl border shrink-0 transition-all group-hover:scale-110",
                                            "bg-slate-950 border-white/5 group-hover:border-white/10 shadow-lg"
                                        )}>
                                            {getIcon(act.type)}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-start gap-4">
                                                <p className="text-xs font-black text-white leading-tight uppercase tracking-tight max-w-[80%]">
                                                    {act.description}
                                                    {act.itemName && <span className="text-brand-accent italic ml-1">@{act.itemName}</span>}
                                                </p>
                                                <span className="text-[9px] font-mono text-slate-600 font-black uppercase shrink-0">
                                                    {getRelativeTime(act.createdAt)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5">
                                                    <User size={8} className="text-slate-500" />
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        {act.userDisplayName || 'Anonymous Oracle'}
                                                    </span>
                                                </div>
                                                {act.amount > 0 && (
                                                    <div className={cn(
                                                        "text-[10px] font-mono font-black italic",
                                                        act.metadata?.isDemo ? "text-amber-400" : "text-emerald-400"
                                                    )}>
                                                        {act.metadata?.isDemo ? '★' : '+'}{act.amount.toLocaleString()} Units
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-32 text-center space-y-6">
                                <div className="w-16 h-16 rounded-[2rem] bg-slate-800/50 flex items-center justify-center mx-auto border border-dashed border-white/10">
                                    <History size={24} className="text-slate-700 opacity-20" />
                                </div>
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">No archival records detected in local cluster.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
