import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import {
    LayoutDashboard,
    TrendingUp,
    History,
    Star,
    Wallet,
    Zap,
    ShieldCheck,
    Clock,
    ChevronRight,
    Briefcase
} from 'lucide-react';
import { cn } from '../lib/utils';

export function UserDashboard() {
    const { user, balance, reputation, stakes, reputationHistory, tier } = useStore();

    return (
        <div className="p-8 space-y-8 bg-[#020617] min-h-screen">
            {/* Header / Stats Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Oracle Portfolio</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none">Session established: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <StatCard label="Available Capital" value={`$${balance.toLocaleString()}`} icon={<Wallet size={16} />} color="text-emerald-400" />
                    <StatCard label="Oracle Reputation" value={reputation.toLocaleString()} icon={<Star size={16} />} color="text-amber-400" />
                    <StatCard label="Identity Tier" value={tier} icon={<ShieldCheck size={16} />} color="text-brand-accent" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Active Stakes & Portfolio */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Active Stakes */}
                    <SectionBox title="Active Deployments" icon={<Briefcase size={16} />}>
                        {stakes.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase">
                                            <th className="py-4">Market Item</th>
                                            <th className="py-4 text-right">Magnitude</th>
                                            <th className="py-4 text-right">Target Rank</th>
                                            <th className="py-4 text-right">Est. Yield</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {stakes.map(stake => (
                                            <tr key={stake.id} className="group hover:bg-slate-800/20 transition-colors">
                                                <td className="py-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:border-brand-accent/30 transition-all">
                                                        <Zap size={14} fill="currentColor" className="text-emerald-500" />
                                                    </div>
                                                    <span className="text-xs font-black text-white uppercase">{stake.itemName}</span>
                                                </td>
                                                <td className="py-4 text-right font-mono text-xs font-bold text-slate-300">${stake.amount.toLocaleString()}</td>
                                                <td className="py-4 text-right font-mono text-xs font-black text-brand-accent">#{stake.targetRank}</td>
                                                <td className="py-4 text-right font-mono text-xs font-black text-emerald-400">+{((stake.amount * stake.odds) - stake.amount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-16 text-center border-2 border-dashed border-slate-900 rounded-3xl">
                                <Zap size={32} className="mx-auto text-slate-800 mb-4" />
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">No active market participation detected.</p>
                            </div>
                        )}
                    </SectionBox>

                    {/* Analytics / Reputation Chart (Placeholder for visual) */}
                    <SectionBox title="Reputation Velocity" icon={<TrendingUp size={16} />}>
                        <div className="h-48 flex items-end gap-1 px-4">
                            {[40, 60, 45, 70, 85, 90, 80, 75, 95, 100, 85, 110, 120].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    className="flex-1 bg-gradient-to-t from-brand-accent/5 via-brand-accent/20 to-brand-accent rounded-t-sm"
                                />
                            ))}
                        </div>
                    </SectionBox>
                </div>

                {/* Right Col: Activity & Identity */}
                <div className="space-y-8">
                    <SectionBox title="Influence Archive" icon={<History size={16} />}>
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4 items-start group">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-brand-accent transition-all shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-bold text-slate-300 leading-tight">
                                            Executed rank up command on <span className="text-white underline decoration-brand-accent/20">Bitcoin</span> in global market.
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-600 font-bold uppercase tracking-tighter">04:22:15 UTC • BATCH #482</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 rounded-xl border border-slate-800 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all flex items-center justify-center gap-2">
                            View Full Logs <ChevronRight size={12} />
                        </button>
                    </SectionBox>

                    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-brand-accent flex items-center justify-center text-slate-950">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-white uppercase">AVD Verification</h3>
                                <p className="text-[10px] text-emerald-500/80 font-black uppercase">TRUST SCORE: 98.4%</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                            Your account is fully synchronized with the Anomalous Velocity Detection engine. All votes are currently processed with full weight.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="px-6 py-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl min-w-[160px]">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-500">{icon}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <div className={cn("text-xl font-mono font-black italic", color)}>{value}</div>
        </div>
    );
}

function SectionBox({ title, icon, children }) {
    return (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 border-b border-slate-800 pb-4">
                <span className="text-brand-accent">{icon}</span> {title}
            </h2>
            {children}
        </div>
    );
}
