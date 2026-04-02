import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, Loader2, Zap, Trophy, TrendingUp, Shield, Activity, Info } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
    win: { icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    loss: { icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    deposit: { icon: Zap, color: 'text-brand-accent', bg: 'bg-brand-accent/10', border: 'border-brand-accent/20' },
    system: { icon: Shield, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    epoch: { icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    default: { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
};

export function NotificationsPanel({ isOpen, onClose }) {
    const { notifications, fetchNotifications, markNotificationAsRead, markAllRead } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            fetchNotifications().finally(() => setIsLoading(false));
        }
    }, [isOpen, fetchNotifications]);

    const handleNotificationClick = async (notif) => {
        if (!notif.read) {
            await markNotificationAsRead(notif.id);
        }
        onClose();
        if (notif.type === 'win' || notif.type === 'loss') {
            navigate('/portfolio');
        } else if (notif.type === 'referral') {
            navigate('/portfolio');
        } else if (notif.type === 'epoch') {
            navigate('/history');
        }
    };

    const handleMarkAll = async () => {
        await markAllRead();
        fetchNotifications();
    };

    const getRelativeTime = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'JUST NOW';
        if (minutes < 60) return `${minutes}M AGO`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}H AGO`;
        return new Date(date).toLocaleDateString().toUpperCase();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[140] bg-slate-950/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Panel Container */}
                    <div className="fixed inset-x-4 top-20 md:absolute md:inset-auto md:right-6 md:top-20 z-[150] pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className={cn(
                                "pointer-events-auto w-full md:w-[420px] max-h-[600px] flex flex-col",
                                "bg-slate-950/90 border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl"
                            )}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                                        <span className="font-black text-[12px] uppercase tracking-[0.2em] text-white">System Alerts</span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Status: Operational</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {(notifications || []).some(n => !n.read) && (
                                        <button
                                            onClick={handleMarkAll}
                                            className="text-[10px] font-black uppercase tracking-widest text-brand-accent hover:text-white transition-colors flex items-center gap-2"
                                        >
                                            <Check size={12} /> Clear All
                                        </button>
                                    )}
                                    <button 
                                        onClick={onClose} 
                                        className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
                                {isLoading && (!notifications || notifications.length === 0) ? (
                                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                        <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Decrypting Stream...</p>
                                    </div>
                                ) : (!notifications || notifications.length === 0) ? (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-slate-900 mx-auto flex items-center justify-center border border-white/5">
                                            <Info size={24} className="text-slate-700" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-300 uppercase tracking-widest font-black">Zero Activity</p>
                                            <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-1">Awaiting data settlements...</p>
                                        </div>
                                    </div>
                                ) : (
                                    (notifications || []).map((notif, idx) => {
                                        const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.default;
                                        const Icon = config.icon;
                                        return (
                                            <motion.button
                                                key={notif.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                onClick={() => handleNotificationClick(notif)}
                                                className={cn(
                                                    "w-full p-4 rounded-2xl text-left transition-all border group relative overflow-hidden",
                                                    notif.read
                                                        ? "bg-transparent border-white/5 hover:bg-white/5"
                                                        : "bg-white/5 border-white/10 hover:border-brand-accent/30"
                                                )}
                                            >
                                                <div className="flex gap-4 relative z-10">
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg", config.bg, config.border)}>
                                                        <Icon size={18} className={config.color} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[11px] font-black text-white uppercase tracking-tight truncate">
                                                                {notif.title}
                                                            </span>
                                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap ml-2">
                                                                {getRelativeTime(notif.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 font-medium">
                                                            {notif.message}
                                                        </p>
                                                    </div>
                                                    {!notif.read && (
                                                        <div className="absolute right-0 top-0 w-1 h-full bg-brand-accent shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
                                                    )}
                                                </div>
                                                {/* Scanline overlay for unread */}
                                                {!notif.read && <div className="absolute inset-0 scanlines opacity-5 pointer-events-none" />}
                                            </motion.button>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-white/5 border-t border-white/5 flex justify-center shrink-0">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">End of Transmission</span>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
