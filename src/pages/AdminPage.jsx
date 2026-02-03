import React, { useState } from 'react';
import {
    ShieldAlert,
    Activity,
    Wifi,
    Database,
    Users,
    Zap,
    AlertTriangle,
    RefreshCw,
    Terminal,
    Lock
} from 'lucide-react';
import { cn } from '../lib/utils';

export function AdminPage() {
    const [isKillswitchArmed, setKillswitchArmed] = useState(false);

    return (
        <div className="p-8 space-y-12 bg-[#020617] min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                            <ShieldAlert size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Ops Overwatch</h1>
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Restricted Management Surface • Clearance Level: Oracle Alpha</p>
                </div>

                {/* Emergency Controls */}
                <div className="flex gap-4">
                    <button
                        onClick={() => setKillswitchArmed(!isKillswitchArmed)}
                        className={cn(
                            "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3",
                            isKillswitchArmed ? "bg-rose-500 text-white animate-pulse" : "bg-slate-900 border border-slate-800 text-rose-500 hover:bg-rose-500/10"
                        )}
                    >
                        <AlertTriangle size={16} /> {isKillswitchArmed ? 'Global Killswitch Prime' : 'Emergency Stop'}
                    </button>
                    {isKillswitchArmed && (
                        <button className="px-6 py-3 rounded-2xl bg-white text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all border-4 border-rose-600">
                            Execute Circuit Break
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* System Vital Stats */}
                <div className="lg:col-span-1 space-y-4">
                    <AdminStat label="Network Status" value="Nominal" icon={<Wifi size={14} />} color="text-emerald-400" />
                    <AdminStat label="Settlement Nodes" value="12/12" icon={<Database size={14} />} color="text-brand-accent" />
                    <AdminStat label="Active Oracles" value="4,281" icon={<Users size={14} />} color="text-slate-300" />
                    <AdminStat label="AVD Dampening" value="8.2%" icon={<AlertTriangle size={14} />} color="text-amber-500" />
                </div>

                {/* Automation & Ingestors */}
                <div className="lg:col-span-3 space-y-8">
                    <AdminBox title="Data Ingestors" icon={<RefreshCw size={16} />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <IngestorCard name="CoinGecko Mainnet" status="Syncing" frequency="60s" latency="42ms" />
                            <IngestorCard name="Star Oracle v2" status="Nominal" frequency="30m" latency="1.2s" />
                            <IngestorCard name="AVD Anomaly Scanner" status="Monitoring" frequency="Real-time" latency="4ms" />
                            <IngestorCard name="Social Sentiment Agg" status="Error" frequency="5m" latency="N/A" error />
                        </div>
                    </AdminBox>

                    <AdminBox title="Security Registry" icon={<Terminal size={16} />}>
                        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-[10px] space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                            <p className="text-slate-500">[12:44:01] AVD: High-velocity cluster detected in Category: Crypto -&gt; Item: Dogecoin</p>
                            <p className="text-emerald-500">[12:44:05] SYSTEM: Weighted dampening (0.42x) applied to Epoch #4201</p>
                            <p className="text-slate-500">[12:45:12] AUTH: New Oracle promotion request from user_8829</p>
                            <p className="text-rose-500">[12:45:30] WARN: Rate limit exceeded on Ingestor: Sentiment_Agg</p>
                            <p className="text-slate-500">[12:46:00] CRON: Triggering automated snapshot reification...</p>
                        </div>
                    </AdminBox>
                </div>
            </div>
        </div>
    );
}

function AdminStat({ label, value, icon, color }) {
    return (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex justify-between items-center group hover:border-slate-700 transition-all">
            <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    {icon} {label}
                </p>
                <p className={cn("text-xl font-mono font-black italic", color)}>{value}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
    );
}

function AdminBox({ title, icon, children }) {
    return (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 border-b border-slate-800 pb-4">
                <span className="text-brand-accent">{icon}</span> {title}
            </h2>
            {children}
        </div>
    );
}

function IngestorCard({ name, status, frequency, latency, error }) {
    return (
        <div className={cn(
            "p-5 rounded-2xl bg-slate-950 border transition-all flex justify-between items-center",
            error ? "border-rose-500/50 bg-rose-500/5" : "border-slate-800 hover:border-slate-600"
        )}>
            <div className="space-y-1">
                <h4 className="text-[11px] font-black text-white uppercase">{name}</h4>
                <div className="flex gap-3 text-[9px] font-black uppercase text-slate-500">
                    <span>Freq: {frequency}</span>
                    <span>Lat: {latency}</span>
                </div>
            </div>
            <div className="text-right">
                <div className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
                    error ? "bg-rose-500/20 text-rose-500" : "bg-emerald-500/20 text-emerald-500"
                )}>
                    {status}
                </div>
            </div>
        </div>
    );
}
