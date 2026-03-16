import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, Loader2 } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

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

    const typeIcons = {
        win: '🏆',
        loss: '📉',
        deposit: '💳',
        system: '⚙️',
        epoch: '⏱️',
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

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop — closes panel when clicking outside */}
            <div
                className="fixed inset-0 z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                    "absolute right-0 top-full mt-2 z-50",
                    "w-[380px] max-w-[calc(100vw-32px)]",
                    "max-h-[480px] overflow-hidden flex flex-col",
                    "bg-[#0D1B2A] border border-[#C9A84C]/30",
                    "rounded-2xl shadow-2xl shadow-black/50"
                )}
            >
                {/* Header */}
                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-2 text-white font-black uppercase text-xs tracking-widest">
                        <Bell size={14} className="text-[#C9A84C]" />
                        <span>Alerts</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {(notifications || []).some(n => !n.read) && (
                            <button
                                onClick={handleMarkAll}
                                className="text-[9px] uppercase tracking-widest text-[#C9A84C] hover:text-white transition-colors flex items-center gap-1"
                            >
                                <Check size={10} /> Mark All Read
                            </button>
                        )}
                        <button onClick={onClose} className="p-1 rounded bg-white/5 text-slate-400 hover:text-white md:hidden">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {isLoading && (!notifications || notifications.length === 0) ? (
                        /* Skeleton loading */
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse bg-white/5 rounded-lg h-16 w-full" />
                            ))}
                        </div>
                    ) : (!notifications || notifications.length === 0) ? (
                        /* Empty state */
                        <div className="py-8 text-center space-y-2">
                            <Bell size={24} className="mx-auto text-white/10" />
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                                No alerts yet
                            </p>
                            <p className="text-[9px] text-slate-600">
                                Stake settlements will appear here.
                            </p>
                        </div>
                    ) : (
                        (notifications || []).map(notif => (
                            <button
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={cn(
                                    "w-full p-3 rounded-lg text-left transition-all border",
                                    notif.read
                                        ? "bg-slate-900/50 border-white/5 hover:bg-white/5"
                                        : "bg-[#C9A84C]/5 border-l-2 border-[#C9A84C] hover:bg-[#C9A84C]/10"
                                )}
                            >
                                <div className="flex gap-3">
                                    <div className="text-lg shrink-0 mt-0.5">
                                        {typeIcons[notif.type] || '🔔'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-black text-white uppercase tracking-wider mb-1 truncate">
                                            {notif.title}
                                        </div>
                                        <div className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                                            {notif.message}
                                        </div>
                                        <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-2">
                                            {getRelativeTime(notif.createdAt)}
                                        </div>
                                    </div>
                                    {!notif.read && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse shrink-0 mt-2" />
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </motion.div>
        </>
    );
}
