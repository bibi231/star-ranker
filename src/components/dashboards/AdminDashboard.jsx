import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    ShieldAlert,
    Users,
    ZapOff,
    LifeBuoy,
    Activity,
    Database,
    Lock,
    Unlock,
    AlertTriangle,
    CheckCircle2,
    RefreshCw
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export function AdminDashboard() {
    const [killSwitchActive, setKillSwitchActive] = useState(false);
    const { categories, items } = useStore();

    // Mock Ops Data
    const sysHealth = {
        oracle: 'operational',
        ingestor: 'operational',
        db: 'operational',
        avgLatency: '142ms'
    };

    return (
        <div className="space-y-6">
            {/* Header / Emergency Panel */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <Lock className="text-slate-500" size={24} /> MISSION CONTROL
                    </h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Admin Authorization Level 4 Active</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right mr-2">
                        <div className="text-[10px] font-black text-slate-500 uppercase">System Status</div>
                        <div className="text-xs font-mono text-emerald-500 font-bold uppercase flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live & Secure
                        </div>
                    </div>
                    <button
                        onClick={() => setKillSwitchActive(!killSwitchActive)}
                        className={cn(
                            "px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2",
                            killSwitchActive
                                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                : "bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-700"
                        )}
                    >
                        {killSwitchActive ? <Unlock size={18} /> : <ZapOff size={18} />}
                        {killSwitchActive ? "Deactivate Kill Switch" : "Global Kill Switch"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* System Integrity */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">System Integrity</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <IntegrityCard label="Settlement Oracle" status={sysHealth.oracle} icon={<ShieldCheck size={16} />} />
                        <IntegrityCard label="Data Ingestors" status={sysHealth.ingestor} icon={<Database size={16} />} />
                        <IntegrityCard label="Latency (Global)" value={sysHealth.avgLatency} icon={<Activity size={16} />} />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3">Recent Incidents</h4>
                        <div className="space-y-2">
                            <div className="text-[10px] text-slate-400 p-2 border-l-2 border-emerald-500 bg-emerald-500/5">
                                [RESOLVED] Oracle Payout Variance (0.02%) - 2h ago
                            </div>
                            <div className="text-[10px] text-slate-400 p-2 border-l-2 border-slate-700">
                                [INFO] AVD Cluster Auto-Dampened (IP: 142.x.x) - 5h ago
                            </div>
                        </div>
                    </div>
                </div>

                {/* Market Management */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2 flex justify-between items-center">
                        Market Freeze Hub
                        <span className="text-[10px] text-brand-accent animate-pulse font-bold tracking-normal underline">4 Active Markets</span>
                    </h3>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-800/50 text-[10px] text-slate-500 uppercase font-black">
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Volume (24h)</th>
                                    <th className="p-4">Flag Count</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-200">{cat.title}</div>
                                            <div className="text-[10px] text-slate-500">/{cat.slug}</div>
                                        </td>
                                        <td className="p-4 font-mono text-slate-400 text-sm">$45,200</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Clear</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-400 transition-colors">Freeze Market</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Quick Tools */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ToolCard
                            title="User Moderation"
                            desc="Ban accounts, reset reputation, audit activity."
                            icon={<Users size={20} />}
                        />
                        <ToolCard
                            title="Oracle Calibration"
                            desc="Adjust payout multipliers and reification cycles."
                            icon={<RefreshCw size={20} />}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function IntegrityCard({ label, status, value, icon }) {
    return (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="text-slate-500">{icon}</div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            {status ? (
                <div className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1">
                    <CheckCircle2 size={12} /> {status}
                </div>
            ) : (
                <div className="text-sm font-mono text-slate-200 font-bold">{value}</div>
            )}
        </div>
    );
}

function ToolCard({ title, desc, icon }) {
    return (
        <button className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-slate-700 transition-all group shadow-sm">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-colors w-fit mb-3">
                {icon}
            </div>
            <h4 className="text-xs font-black text-slate-100 uppercase mb-1">{title}</h4>
            <p className="text-[10px] text-slate-500 leading-tight">{desc}</p>
        </button>
    );
}
