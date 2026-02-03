import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, Users, Zap, BarChart3, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export function MarketDashboard() {
    const { items, currentCategorySlug, categories } = useStore();
    const category = categories.find(c => c.slug === currentCategorySlug);

    // Mock Market Metrics (In Prod: Pulled from Analytics Engine)
    const metrics = {
        health: 88,
        volatility: 12.4,
        participation: 4500,
        avdFlags: 3,
        liquidity: 1250000
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">
                        Market Intelligence
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Real-time health telemetry for {category?.title || 'Global Markets'}</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        SYSTEMS NORMAL
                    </span>
                </div>
            </div>

            {/* Health Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MarketStat cardTitle="Liquidity Depth" value={`$${(metrics.liquidity / 1000000).toFixed(1)}M`} icon={<Zap size={16} />} color="text-brand-accent" />
                <MarketStat cardTitle="Volatility (24h)" value={`${metrics.volatility}%`} icon={<Activity size={16} />} color="text-amber-400" />
                <MarketStat cardTitle="Participation" value={metrics.participation.toLocaleString()} icon={<Users size={16} />} color="text-slate-200" />
                <MarketStat cardTitle="AVD Flags" value={metrics.avdFlags} icon={<ShieldAlert size={16} />} color="text-rose-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Participation Chart */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <BarChart3 size={16} /> Liquidity Distribution
                    </h3>
                    <div className="space-y-4">
                        {items.map((item, i) => (
                            <div key={item.id} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                    <span className="text-slate-200">{item.name}</span>
                                    <span className="text-brand-accent">${(item.score * 12.5).toLocaleString()}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(item.score / items[0].score) * 100}%` }}
                                        className="h-full bg-brand-accent transition-all"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AVD Flags / Anomalies */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <AlertCircle size={16} /> AVD Signals
                    </h3>
                    <div className="space-y-4">
                        {[
                            { type: 'Velocity Spike', severity: 'High', item: 'Solana', time: '12m ago' },
                            { type: 'IP Clustering', severity: 'Med', item: 'Bitcoin', time: '45m ago' },
                            { type: 'Sybil Pattern', severity: 'Low', item: 'Global', time: '2h ago' }
                        ].map((flag, i) => (
                            <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-black text-slate-200 uppercase">{flag.type}</div>
                                    <div className="text-[10px] text-slate-500">{flag.item} • {flag.time}</div>
                                </div>
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                    flag.severity === 'High' ? "bg-rose-500/20 text-rose-500" :
                                        flag.severity === 'Med' ? "bg-amber-500/20 text-amber-500" : "bg-slate-500/20 text-slate-500"
                                )}>
                                    {flag.severity}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-6 py-2 rounded-xl bg-slate-800 text-[10px] font-black text-slate-300 hover:bg-slate-700 transition-colors uppercase tracking-widest">
                        View Full Security Audit
                    </button>
                </div>
            </div>
        </div>
    );
}

function MarketStat({ cardTitle, value, icon, color }) {
    return (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3 mb-2 text-slate-500">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{cardTitle}</span>
            </div>
            <div className={cn("text-xl font-mono font-black", color)}>{value}</div>
        </div>
    );
}
