import React from 'react';
import { motion } from 'framer-motion';
import { Bell, ShieldCheck, Zap, X, Trash2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export function AlertsPage() {
    const { notifications, markNotificationAsRead, fetchNotifications, markAllRead } = useStore();

    React.useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="p-8 space-y-8 bg-[#020617] min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-brand-accent/10 text-brand-accent">
                            <Bell size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">System Alerts</h1>
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Oracle Notification Feed • {unreadCount} Pending Actions</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={markAllRead}
                        className="px-5 py-2.5 rounded-xl border border-slate-800 text-[10px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                        <CheckCircle2 size={14} /> Mark All Read
                    </button>
                    <button className="px-5 py-2.5 rounded-xl border border-slate-800 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-2">
                        <Trash2 size={14} /> Clear Archive
                    </button>
                </div>
            </header>

            <div className="max-w-4xl space-y-4">
                {notifications.length > 0 ? (
                    notifications.map((n, i) => (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={cn(
                                "p-6 rounded-[2rem] border transition-all flex items-start gap-6 group",
                                n.read
                                    ? "bg-slate-900/40 border-slate-800/50 opacity-60"
                                    : "bg-slate-900 border-slate-800 hover:border-brand-accent/30 shadow-xl"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                                n.read ? "bg-slate-950 text-slate-700" : "bg-brand-accent/10 text-brand-accent"
                            )}>
                                {n.type === 'security' ? <ShieldCheck size={20} /> : <Zap size={20} />}
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-center">
                                    <h3 className={cn(
                                        "text-sm font-black uppercase tracking-tight",
                                        n.read ? "text-slate-500" : "text-white"
                                    )}>
                                        {n.title || 'System Broadcast'}
                                    </h3>
                                    <span className="text-[9px] font-mono text-slate-600 font-bold uppercase">12:44:0{i} UTC</span>
                                </div>
                                <p className={cn(
                                    "text-xs font-medium leading-relaxed",
                                    n.read ? "text-slate-600" : "text-slate-400"
                                )}>
                                    {n.message}
                                </p>
                            </div>

                            {!n.read && (
                                <button
                                    onClick={() => markNotificationAsRead(n.id)}
                                    className="p-2 text-slate-700 hover:text-brand-accent transition-colors"
                                >
                                    <CheckCircle2 size={18} />
                                </button>
                            )}
                        </motion.div>
                    ))
                ) : (
                    <div className="py-24 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-800">
                            <Bell size={40} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Archive Empty</h3>
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">No active system alerts detected in the current epoch.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
