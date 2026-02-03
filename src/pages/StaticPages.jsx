import React from 'react';
import {
    Activity,
    Award,
    Info,
    ShieldCheck,
    Clock,
    Zap,
    Scale,
    FileText,
    Lock,
    Search
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export function ActivityPage() {
    return (
        <div className="p-8 space-y-8 bg-[#020617] min-h-screen">
            <header className="space-y-2">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Market Pulse</h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Real-time influence log from the global ranker network.</p>
            </header>

            <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex justify-between items-center group hover:border-brand-accent/30 transition-all">
                        <div className="flex items-center gap-6">
                            <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                                <Activity size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white uppercase tracking-tight">
                                    Oracle_{800 + i} <span className="text-slate-500 font-bold">deployed influence on</span> Bitcoin
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[9px] font-mono text-emerald-500 font-black uppercase">VOTE_UP</span>
                                    <span className="text-[9px] font-mono text-slate-600">TXID: 0x{Math.random().toString(16).slice(2, 10)}</span>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">{i * 2} minutes ago</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function LeaderboardPage() {
    return (
        <div className="p-8 space-y-12 bg-[#020617] min-h-screen">
            <header className="space-y-2">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Oracle Rankings</h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">The most accurate predictors in the Star Ranker ecosystem.</p>
            </header>

            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-8 py-4 w-24 text-center">Rank</th>
                            <th className="px-8 py-4">Oracle Identity</th>
                            <th className="px-8 py-4 text-right">Reputation</th>
                            <th className="px-8 py-4 text-right">Accuracy Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                            <tr key={r} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-8 py-5 text-center font-mono text-base font-black italic text-slate-500">#{r}</td>
                                <td className="px-8 py-5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-brand-accent">
                                        <Award size={20} />
                                    </div>
                                    <span className="font-black text-white uppercase tracking-tight">Predictor_Node_{r * 12}</span>
                                </td>
                                <td className="px-8 py-5 text-right font-mono text-sm font-black text-slate-100 italic">{(45000 / r).toLocaleString()}</td>
                                <td className="px-8 py-5 text-right font-mono text-sm font-black text-emerald-400">98.{r}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function StaticInfoPage({ title, icon: Icon }) {
    return (
        <div className="min-h-screen bg-[#020617] p-8 md:p-16">
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-4 border-b border-slate-800 pb-12">
                    <div className="flex items-center gap-6">
                        <div className="p-4 rounded-3xl bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-xl shadow-brand-accent/5">
                            <Icon size={48} />
                        </div>
                        <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">{title}</h1>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-8">
                    <div className="space-y-6">
                        <SectionHeader title="Settlement Protocol" icon={<Scale size={20} />} />
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            Star Ranker utilizes a deterministic reification engine. Every 30 minutes (an "Epoch"), the system aggregates weighted influence across all active nodes. Settlement is finalized only when consensus exceeds the 60% confidence threshold.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <SectionHeader title="AVD Security" icon={<Lock size={20} />} />
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            Anomalous Velocity Detection (AVD) is our proprietary defense layer. It monitors the Z-score of incoming influence clusters. Votes that deviate significantly from historical behavioral norms are automatically dampened to prevent market manipulation.
                        </p>
                    </div>
                </div>

                <div className="p-12 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-3xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/5 rounded-full blur-[80px]" />

                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3 relative z-10">
                        <FileText className="text-brand-accent" /> Governance & Risk Attributes
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                        <DocItem
                            title="Stake Finality"
                            desc="Once deployed, stakes are non-custodial and locked until the market event reification is confirmed by the Oracle."
                        />
                        <DocItem
                            title="Reputation Slashing"
                            desc="Attempting to sybil or brigade the consensus leads to a permanent reputation burn and AVD blacklisting."
                        />
                        <DocItem
                            title="Capital Exposure"
                            desc="Users take full responsibility for stake selection. The Oracle does not guarantee specific market outcomes."
                        />
                        <DocItem
                            title="Snapshot Integrity"
                            desc="Snapshots are timestamped and cryptographically linked to prevent retroactive influence injection."
                        />
                    </div>
                </div>

                <footer className="text-center pt-12">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Protocol Hardware: Operational • Network Load: Nominal</p>
                </footer>
            </div>
        </div>
    );
}

function SectionHeader({ title, icon }) {
    return (
        <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="text-brand-accent">{icon}</span> {title}
        </h3>
    );
}

function DocItem({ title, desc }) {
    return (
        <div className="space-y-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">{title}</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{desc}</p>
        </div>
    );
}
