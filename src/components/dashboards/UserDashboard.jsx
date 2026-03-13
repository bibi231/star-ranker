import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, History, Bell, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useStore } from '../../store/storeModel';
import { cn } from '../../lib/utils';

export function UserDashboard() {
    const { user, balance, reputation, tier, stakes, notifications, reputationHistory } = useStore();

    if (!user) return <div className="p-10 text-center text-slate-500">Please connect your wallet to view your dashboard.</div>;

    return (
        <div className="space-y-6">
            {/* Header / Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Account Balance"
                    value={`$${balance.toLocaleString()}`}
                    icon={<Wallet className="text-brand-accent" />}
                    trend="+12% this week"
                />
                <StatCard
                    title="Reputation"
                    value={reputation.toLocaleString()}
                    icon={<Award className="text-amber-400" />}
                    subtext={`${tier} Rank`}
                />
                <StatCard
                    title="Active Stakes"
                    value={stakes.length}
                    icon={<TrendingUp className="text-emerald-500" />}
                    subtext={`Total Value: $${stakes.reduce((acc, s) => acc + s.amount, 0).toLocaleString()}`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reputation Graph */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Reputation Velocity</h3>
                        <div className="flex gap-2">
                            {['7D', '1M', 'ALL'].map(t => (
                                <button key={t} className="px-2 py-1 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-white transition-colors">{t}</button>
                            ))}
                        </div>
                    </div>
                    <div className="h-48 flex items-end gap-1 px-2">
                        {reputationHistory.map((point, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${(point.value / 2000) * 100}%` }}
                                className="flex-1 bg-brand-accent/20 border-t-2 border-brand-accent min-w-[30px]"
                                title={`${point.date}: ${point.value}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Notifications */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <Bell size={16} /> Latest Alerts
                    </h3>
                    <div className="space-y-4 max-h-[192px] overflow-y-auto pr-2 custom-scrollbar">
                        {notifications.length > 0 ? notifications.map(n => (
                            <div key={n.id} className={cn("p-3 rounded-lg border flex items-start gap-3", n.read ? "bg-slate-900/50 border-slate-800" : "bg-slate-800 border-slate-700")}>
                                <div className={cn("p-1.5 rounded-md", n.type === 'win' ? "bg-emerald-500/10 text-emerald-500" : "bg-brand-accent/10 text-brand-accent")}>
                                    {n.type === 'win' ? <ArrowUpRight size={14} /> : <TrendingUp size={14} />}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-200">{n.message}</p>
                                    <span className="text-[10px] text-slate-500">{new Date(n.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="py-10 text-center text-slate-600 text-xs">No new notifications.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stakes Table */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Active Portfolio</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-black">
                                <th className="pb-3">Market Item</th>
                                <th className="pb-3">Stake</th>
                                <th className="pb-3">Target Rank</th>
                                <th className="pb-3">Oracle Odds</th>
                                <th className="pb-3 text-right">Potential Payout</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {stakes.map(s => (
                                <tr key={s.id} className="group">
                                    <td className="py-4 font-bold text-slate-200">{s.itemName}</td>
                                    <td className="py-4 font-mono text-emerald-400">${s.amount.toLocaleString()}</td>
                                    <td className="py-4 text-slate-400 text-sm">#{s.targetRank}</td>
                                    <td className="py-4 text-slate-400 text-sm">x{s.odds}</td>
                                    <td className="py-4 text-right">
                                        <span className="font-mono font-black text-brand-accent text-sm">
                                            ${(s.amount * s.odds).toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {stakes.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-10 text-center text-slate-600 text-xs">No active stakes. Markets are waiting for your influence.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, subtext }) {
    return (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl group hover:border-brand-accent/50 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-brand-accent/10 transition-colors">
                    {icon}
                </div>
                {trend && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">{trend}</span>}
            </div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</h4>
            <div className="text-2xl font-mono font-black text-slate-100">{value}</div>
            {subtext && <div className="mt-2 text-[10px] text-slate-500 font-bold">{subtext}</div>}
        </div>
    );
}
