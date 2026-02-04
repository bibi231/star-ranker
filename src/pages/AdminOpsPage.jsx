import React, { useState } from 'react';
import {
    ShieldAlert,
    Lock,
    Unlock,
    Trash2,
    UserX,
    ZapOff,
    Settings,
    History,
    AlertOctagon,
    Terminal,
    ChevronRight,
    Search,
    Timer,
    Play,
    Pause,
    RefreshCw
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export default function AdminOpsPage() {
    const { user, callAdminFunction } = useStore();
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const handleAction = async (func, args, label) => {
        setLoading(true);
        const result = await callAdminFunction(func, args, label);
        if (result.success) {
            alert(`✅ ${label} successful.`);
        } else {
            alert(`❌ Error: ${result.error}`);
        }
        setLoading(false);
    };

    if (!user?.isAdmin && !user?.isModerator) {
        return (
            <div className="h-full flex items-center justify-center bg-black">
                <div className="text-center space-y-4">
                    <ShieldAlert size={64} className="mx-auto text-rose-500 animate-pulse" />
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Access Denied</h1>
                    <p className="text-slate-500 font-mono text-sm uppercase">Unauthorized access to Operational Overwatch is prohibited.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-black/95 min-h-screen font-mono">
            {/* Header */}
            <div className="flex justify-between items-end border-b-4 border-rose-600 pb-4">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Operational Overwatch</h1>
                    <p className="text-rose-500 text-xs font-bold uppercase tracking-widest mt-1">
                        [ STATUS: {user.isAdmin ? 'SUPER-ADMIN' : 'MODERATOR'} AUTHENTICATED ]
                    </p>
                </div>
                <div className="text-right text-[10px] text-slate-500 uppercase leading-none">
                    <p>Terminal: SR-ALPHA-01</p>
                    <p>Session: {new Date().toLocaleTimeString()}</p>
                </div>
            </div>

            {/* Emergency Killswitch */}
            <div className="p-6 bg-rose-950/20 border-2 border-rose-600 rounded-2xl flex items-center justify-between group transition-all hover:bg-rose-950/30">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <AlertOctagon className="text-rose-500 animate-pulse" />
                        SYSTEM KILLSWITCH
                    </h3>
                    <p className="text-sm text-rose-400 max-w-xl font-bold italic">
                        Immediately pauses all market trading, ZMG runs, and item voting globally.
                        Use ONLY in case of catastrophic market manipulation.
                    </p>
                </div>
                <button
                    onClick={() => handleAction('emergencyKillswitch', {}, 'Pause Platform')}
                    className="px-8 py-4 bg-rose-600 text-white font-black uppercase text-sm rounded-xl transform transition-transform group-hover:scale-105 active:scale-95 shadow-lg shadow-rose-600/40"
                    disabled={loading}
                >
                    ACTIVATE KILLSWITCH
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-2 space-y-12">

                    {/* Market Section */}
                    <div className="space-y-6">
                        <SectionHeader icon={<ShieldAlert size={18} />} title="Market Interdiction" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ControlCard
                                icon={<ZapOff />}
                                title="Freeze Market"
                                desc="Lock all items in a specific market category."
                                onAction={() => handleAction('freezeMarket', { marketId: '...' }, 'Freeze Market')}
                                color="orange"
                            />
                            <ControlCard
                                icon={<Lock />}
                                title="Lock Item"
                                desc="Prevent further voting on a specific item (for vetting)."
                                onAction={() => handleAction('lockItem', { itemId: '...' }, 'Lock Item')}
                                color="blue"
                            />
                            <ControlCard
                                icon={<Trash2 />}
                                title="Delist Entity"
                                desc="Permanently remove an item from the ranking."
                                onAction={() => handleAction('delistItem', { itemId: '...' }, 'Delist Item')}
                                color="rose"
                            />
                            <ControlCard
                                icon={<History />}
                                title="Re-run Settlement"
                                desc="Correct a failed or incorrect stake settlement."
                                onAction={() => handleAction('recalculateSettlement', { stakeId: '...' }, 'Re-run Settlement')}
                                color="purple"
                            />
                        </div>
                    </div>

                    {/* Epoch Section */}
                    <div className="space-y-6">
                        <SectionHeader icon={<Timer size={18} />} title="Temporal Sovereignty (Epochs)" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ControlCard
                                icon={<Pause />}
                                title="Pause Epochs"
                                desc="Halt global epoch progression and snapshots."
                                onAction={() => handleAction('toggleEpochProgression', { isPaused: true }, 'Pause Epochs')}
                                color="rose"
                            />
                            <ControlCard
                                icon={<Play />}
                                title="Resume Epochs"
                                desc="Resume standard 30-minute epoch cycles."
                                onAction={() => handleAction('toggleEpochProgression', { isPaused: false }, 'Resume Epochs')}
                                color="blue"
                            />
                            <ControlCard
                                icon={<RefreshCw />}
                                title="Force Rollover"
                                desc="Trigger an immediate epoch close and snapshot."
                                onAction={() => handleAction('forceEpochRollover', {}, 'Force Rollover')}
                                color="orange"
                            />
                        </div>
                    </div>

                    {/* User Section */}
                    <div className="space-y-6">
                        <SectionHeader icon={<UserX size={18} />} title="User Overwatch" />
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="SEARCH UID / EMAIL TO INTERDICT..."
                                    className="w-full bg-black border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-slate-200 outline-none focus:border-rose-500 transition-colors"
                                />
                            </div>
                            <button className="px-6 py-3 bg-slate-800 text-slate-400 font-bold uppercase text-xs rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                                Shadow Ban
                            </button>
                            <button className="px-6 py-3 bg-rose-900/30 text-rose-500 font-bold uppercase text-xs rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                                Wipe Account
                            </button>
                        </div>
                    </div>
                </div>

                {/* Audit Logs Sidebar */}
                <div className="space-y-6">
                    <SectionHeader icon={<Terminal size={18} />} title="Audit Stream" />
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[600px]">
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="space-y-1 border-l-2 border-rose-500/30 pl-3 py-1">
                                    <div className="flex justify-between text-[10px] font-black italic">
                                        <span className="text-rose-500">ADMIN_ACTION_LOCK_ITEM</span>
                                        <span className="text-slate-600">14:23:45</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-bold break-all">target: phone_iphone_16_pro</p>
                                    <p className="text-[9px] text-slate-600 uppercase">By: admin@star-ranker.com</p>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-900/50 border-t border-slate-800">
                            <button className="w-full py-2 text-[10px] font-black text-slate-500 uppercase hover:text-rose-500 transition-all">
                                Load Full Archive
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ icon, title }) {
    return (
        <div className="flex items-center gap-2 text-white border-b border-slate-800 pb-2">
            <span className="text-rose-500">{icon}</span>
            <h2 className="text-xs font-black uppercase tracking-widest">{title}</h2>
        </div>
    );
}

function ControlCard({ icon, title, desc, onAction, color }) {
    const colors = {
        rose: "border-rose-500 hover:bg-rose-500/10 text-rose-500",
        orange: "border-orange-500 hover:bg-orange-500/10 text-orange-500",
        blue: "border-blue-500 hover:bg-blue-500/10 text-blue-500",
        purple: "border-purple-500 hover:bg-purple-500/10 text-purple-500",
    };

    return (
        <div className={cn(
            "p-5 rounded-2xl bg-slate-900 border-2 transition-all cursor-pointer group space-y-2",
            colors[color]
        )} onClick={onAction}>
            <div className="flex items-center justify-between">
                <div className="p-2 bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
                    {React.cloneElement(icon, { size: 20 })}
                </div>
                <ChevronRight size={16} className="text-slate-700 group-hover:text-current transition-colors" />
            </div>
            <div>
                <h4 className="font-black text-white text-sm uppercase">{title}</h4>
                <p className="text-slate-500 text-[11px] font-bold leading-tight mt-1">{desc}</p>
            </div>
        </div>
    );
}
