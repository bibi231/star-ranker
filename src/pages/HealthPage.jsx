import React from 'react';
import {
    Zap,
    Activity,
    ShieldCheck,
    RefreshCcw,
    BarChart2,
    Clock,
    Database,
    Lock
} from 'lucide-react';
import { cn } from '../lib/utils';

export function HealthPage() {
    return (
        <div className="p-8 space-y-12 bg-[#020617] min-h-screen">
            <header className="space-y-2 border-b border-slate-800 pb-8">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">System Intelligence</h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Real-time telemetry and market settlement telemetry.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <PulseMetric label="Global Settlement" value="SYNCED" status="optimal" />
                <PulseMetric label="AVD Integrity" value="99.9%" status="optimal" />
                <PulseMetric label="Market Volatility" value="MODERATE" status="warning" />
                <PulseMetric label="Oracle Latency" value="12ms" status="optimal" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Reification Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 border-b border-slate-800 pb-4">
                        <RefreshCcw size={16} className="text-brand-accent" /> Market Reification Pulse
                    </h2>

                    <div className="space-y-4">
                        {[
                            { market: 'Crypto Rankings', status: 'Finalized', time: '12m ago', hash: 'ox72...821' },
                            { market: 'Tech Giants', status: 'Processing', time: 'Current', hash: 'PENDING' },
                            { market: 'Smartphones', status: 'Finalized', time: '42m ago', hash: 'ox11...229' },
                            { market: 'Music Legends', status: 'Scheduled', time: 'In 18m', hash: 'QUEUED' },
                        ].map((m, i) => (
                            <div key={i} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex justify-between items-center group hover:border-brand-accent/30 transition-all">
                                <div className="flex items-center gap-6">
                                    <div className={cn("w-2 h-2 rounded-full", m.status === 'Finalized' ? 'bg-emerald-500' : 'bg-brand-accent animate-pulse')} />
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{m.market}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{m.status} • {m.time}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-mono text-slate-600 font-black tracking-widest">{m.hash}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security Parameters */}
                <div className="space-y-8">
                    <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 border-b border-slate-800 pb-4">
                            <Lock size={16} className="text-amber-500" /> Security Layers
                        </h3>
                        <div className="space-y-6">
                            <SecItem label="Anti-Sybill (AVD)" status="Enabled" />
                            <SecItem label="Rate Limiting" status="Active" />
                            <SecItem label="Weighted Consensus" status="Hardened" />
                            <SecItem label="Audit Logging" status="Streaming" />
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-brand-accent/5 border border-brand-accent/20 space-y-4">
                        <div className="flex items-center gap-3 text-brand-accent">
                            <ShieldCheck size={20} />
                            <h3 className="text-xs font-black uppercase">Transparency Commitment</h3>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                            "Star Ranker operates on a deterministic settlement protocol. Every market reification is immutable and verifiable via the audit ledger."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PulseMetric({ label, value, status }) {
    return (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                status === 'optimal' ? 'bg-emerald-500' : 'bg-amber-500'
            )} />
            <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                <p className={cn(
                    "text-xl font-mono font-black italic",
                    status === 'optimal' ? 'text-white' : 'text-amber-400'
                )}>{value}</p>
            </div>
        </div>
    );
}

function SecItem({ label, status }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400">{label}</span>
            <span className="text-[10px] font-black text-emerald-500 uppercase">{status}</span>
        </div>
    );
}
