import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, Shield, Zap, Info, Clock, ExternalLink } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';

export function SystemStatus() {
    const { formatValue } = useStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchStats = async () => {
        try {
            const { apiGet } = await import('../lib/api');
            const data = await apiGet('/api/system/status');
            if (data) {
                setStats(data);
                setLastRefresh(new Date());
            }
        } catch (err) {
            console.error("Pulse fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    if (loading && !stats) {
        return (
            <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-700/20 shadow-2xl animate-pulse">
                <div className="h-4 w-32 bg-slate-800 rounded-full mb-8" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-slate-800 rounded-2xl" />
                    <div className="h-24 bg-slate-800 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 md:p-10 rounded-[2.5rem] bg-slate-900 border border-slate-700/20 shadow-2xl space-y-8 relative overflow-hidden group">
            {/* Visual Pulse Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Activity size={18} className="text-emerald-500" />
                            <motion.div 
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 bg-emerald-500 rounded-full blur-sm"
                            />
                        </div>
                        <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">Network Pulse</h2>
                    </div>
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest pl-7">
                        Live Integrity Feed • Up 100%
                    </p>
                </div>
                <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={10} /> {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 space-y-2 group/stat">
                    <div className="flex items-center gap-2 text-slate-500 group-hover/stat:text-emerald-400 transition-colors">
                        <Shield size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Total Liquidity</span>
                    </div>
                    <div className="text-lg md:text-xl font-mono font-black text-white tracking-tighter">
                        {formatValue(stats?.totalLiquidity || 0)}
                    </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 space-y-2 group/stat">
                    <div className="flex items-center gap-2 text-slate-500 group-hover/stat:text-sky-400 transition-colors">
                        <Users size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Active Oracles</span>
                    </div>
                    <div className="text-lg md:text-xl font-mono font-black text-white tracking-tighter">
                        {(stats?.totalUsers || 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Recent Global activity */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Zap size={10} className="text-amber-500" /> Real-time Activity
                    </span>
                    <div className="h-[1px] flex-1 bg-white/5 mx-4" />
                </div>
                
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {stats?.recentActivity?.map((act) => (
                            <motion.div 
                                key={act.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">
                                        {act.itemName}
                                    </span>
                                    <span className="text-[8px] font-mono text-slate-600 uppercase">
                                        {act.isPlayMode ? '★ Practice Entry' : 'Protocol Stake'}
                                    </span>
                                </div>
                                <div className={cn(
                                    "text-[10px] font-mono font-black",
                                    act.isPlayMode ? "text-amber-500" : "text-emerald-500"
                                )}>
                                    {act.isPlayMode ? `★${act.amount.toLocaleString()}` : formatValue(act.amount)}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer / Info */}
            <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <Info size={14} />
                </div>
                <p className="text-[9px] text-slate-500 leading-relaxed font-bold uppercase italic">
                    All transactions are recorded on the internal Star Ledger and verified by Anomalous Velocity Detection.
                </p>
            </div>
        </div>
    );
}
