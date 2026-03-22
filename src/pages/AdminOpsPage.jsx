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
    RefreshCw,
    BarChart as ChartIcon,
    DollarSign,
    Users,
    Activity
} from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';
import { isSuperAdminEmail } from '../lib/superAdmins.js';
import { apiGet } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminOpsPage() {
    const { user, callAdminFunction, adminState, formatValue } = useStore();
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Revenue Tab state
    const [activeTab, setActiveTab] = useState('ops'); // 'ops' | 'revenue'
    const [revenueData, setRevenueData] = useState({
        platformRevenue: 0,
        referralEarnings: 0,
        totalBalances: 0,
        totalUsers: 0,
        stakingStats: { totalStakes: 0, totalVolume: 0, activeStakes: 0 },
        categoryBreakdown: []
    });

    React.useEffect(() => {
        if (activeTab === 'revenue') {
            apiGet('/api/admin/revenue')
                .then(data => setRevenueData(data))
                .catch(err => console.error("Failed to load revenue:", err));
        }
    }, [activeTab]);

    const handleAction = async (func, args, label) => {
        setLoading(true);
        const result = await callAdminFunction(func, args, label);
        if (result.success) {
            // Add to simulated log
            setAuditLogs(prev => [{
                action: func,
                time: new Date().toLocaleTimeString(),
                details: JSON.stringify(args),
                user: user.email
            }, ...prev]);
        } else {
            alert(`❌ Error: ${result.error}`);
        }
        setLoading(false);
    };

    if (!user?.email || !isSuperAdminEmail(user.email)) {
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
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-black/95 min-h-screen font-mono">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-4 border-rose-600 pb-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic">Operational Overwatch</h1>
                    <p className="text-rose-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
                        [ STATUS: SUPER-ADMIN AUTHENTICATED ]
                    </p>
                </div>
                <div className="text-left md:text-right text-[10px] text-slate-500 uppercase leading-none mt-2 md:mt-0">
                    <p>Terminal: SR-ALPHA-01</p>
                    <p>Session: {new Date().toLocaleTimeString()}</p>
                </div>
            </div>

            {/* Emergency Killswitch */}
            <div className={cn(
                "p-5 md:p-6 border-2 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group transition-all",
                adminState.killswitch ? "bg-rose-950/50 border-rose-500 animate-pulse" : "bg-rose-950/20 border-rose-800 hover:bg-rose-950/30"
            )}>
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <AlertOctagon className={cn("animate-pulse min-w-5", adminState.killswitch ? "text-white" : "text-rose-500")} />
                        SYSTEM KILLSWITCH
                    </h3>
                    <p className="text-xs md:text-sm text-rose-400 max-w-xl font-bold italic">
                        {adminState.killswitch
                            ? "PLATFORM LOCKDOWN ACTIVE. ALL TRADING HALTED."
                            : "Immediately pauses all market trading, ZMG runs, and item voting globally."}
                    </p>
                </div>
                <button
                    onClick={() => handleAction('emergencyKillswitch', {}, adminState.killswitch ? 'Resume Platform' : 'Pause Platform')}
                    className={cn(
                        "w-full md:w-auto px-8 py-4 font-black uppercase text-sm rounded-xl transform transition-transform md:group-hover:scale-105 active:scale-95 shadow-lg flex-shrink-0 text-center",
                        adminState.killswitch ? "bg-white text-rose-600 shadow-white/20" : "bg-rose-600 text-white shadow-rose-600/40",
                        !isSuperAdminEmail(user?.email) && "opacity-50 cursor-not-allowed grayscale pointer-events-none"
                    )}
                    disabled={loading || !isSuperAdminEmail(user?.email)}
                >
                    {!isSuperAdminEmail(user?.email) ? "SUPERADMIN ONLY" : (adminState.killswitch ? "DEACTIVATE LOCKDOWN" : "ACTIVATE KILLSWITCH")}
                </button>
            </div>

            {/* TAB CONTROLS */}
            <div className="flex gap-4 border-b border-slate-800 pb-2 mb-6">
                <button
                    onClick={() => setActiveTab('ops')}
                    className={cn(
                        "px-6 py-2 rounded-t-xl text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === 'ops' ? "bg-rose-900/50 text-white border-b-2 border-rose-500" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    Operations
                </button>
                <button
                    onClick={() => setActiveTab('revenue')}
                    className={cn(
                        "px-6 py-2 rounded-t-xl text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === 'revenue' ? "bg-emerald-900/30 text-emerald-400 border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    Revenue & Velocity
                </button>
            </div>

            {
                activeTab === 'ops' ? (
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
                                        onAction={() => handleAction('freezeMarket', { marketId: 'crypto' }, 'Freeze Market')}
                                        color="orange"
                                        isActive={adminState.frozenMarkets['crypto']}
                                    />
                                    <ControlCard
                                        icon={<Lock />}
                                        title="Lock Item"
                                        desc="Prevent further voting on a specific item (for vetting)."
                                        onAction={() => {
                                            const id = prompt("Enter Item ID to Lock:");
                                            if (id) handleAction('lockItem', { itemId: id }, 'Lock Item');
                                        }}
                                        color="blue"
                                    />
                                    <ControlCard
                                        icon={<Trash2 />}
                                        title="Delist Entity"
                                        desc="Permanently remove an item from the ranking."
                                        onAction={() => {
                                            const id = prompt("Enter Item ID to Delist:");
                                            if (id) handleAction('delistItem', { itemId: id }, 'Delist Item');
                                        }}
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
                                        disabled={adminState.epochsPaused || !isSuperAdminEmail(user?.email)}
                                    />
                                    <ControlCard
                                        icon={<Play />}
                                        title="Resume Epochs"
                                        desc="Resume standard 30-minute epoch cycles."
                                        onAction={() => handleAction('toggleEpochProgression', { isPaused: false }, 'Resume Epochs')}
                                        color="blue"
                                        disabled={!adminState.epochsPaused || !isSuperAdminEmail(user?.email)}
                                    />
                                    <ControlCard
                                        icon={<RefreshCw />}
                                        title="Force Rollover"
                                        desc={isSuperAdminEmail(user?.email) ? "Trigger an immediate epoch close and snapshot." : "SUPERADMIN ONLY"}
                                        onAction={() => handleAction('forceEpochRollover', {}, 'Force Rollover')}
                                        color="orange"
                                        disabled={!isSuperAdminEmail(user?.email)}
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
                                    <button
                                        disabled={!isSuperAdminEmail(user?.email)}
                                        onClick={() => isSuperAdminEmail(user?.email) && handleAction('wipeAccount', {}, 'Wipe Account')}
                                        className={cn(
                                            "px-6 py-3 font-bold uppercase text-xs rounded-xl transition-all",
                                            isSuperAdminEmail(user?.email) ? "bg-rose-900/30 text-rose-500 hover:bg-rose-600 hover:text-white" : "bg-slate-800 text-slate-600 cursor-not-allowed grayscale"
                                        )}
                                    >
                                        {isSuperAdminEmail(user?.email) ? "Wipe Account" : "ADMIN ONLY"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Audit Logs Sidebar */}
                        <div className="space-y-6">
                            <SectionHeader icon={<Terminal size={18} />} title="Audit Stream" />
                            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[600px]">
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {auditLogs.length > 0 ? auditLogs.map((log, i) => (
                                        <div key={i} className="space-y-1 border-l-2 border-rose-500/30 pl-3 py-1">
                                            <div className="flex justify-between text-[10px] font-black italic">
                                                <span className="text-rose-500">{log.action}</span>
                                                <span className="text-slate-600">{log.time}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-bold break-all">{log.details}</p>
                                            <p className="text-[9px] text-slate-600 uppercase">By: {log.user}</p>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                                            <Activity size={24} className="text-slate-700" />
                                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">No actions logged this session</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-slate-900/50 border-t border-slate-800">
                                    <button className="w-full py-2 text-[10px] font-black text-slate-500 uppercase hover:text-rose-500 transition-all">
                                        Load Full Archive
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 rounded-2xl border-2 border-emerald-500/20 bg-emerald-950/10 space-y-2">
                                <div className="flex justify-between items-center text-emerald-500">
                                    <DollarSign size={20} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lifetime Platform Tax</p>
                                <h3 className="text-4xl font-black text-white font-mono">{formatValue(revenueData.platformRevenue)}</h3>
                                <p className="text-[9px] text-emerald-400 uppercase font-bold tracking-widest">5% Rake — All Markets</p>
                            </div>

                            <div className="p-6 rounded-2xl border-2 border-brand-accent/20 bg-brand-accent/5 space-y-2">
                                <div className="flex justify-between items-center text-brand-accent">
                                    <Users size={20} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Referral Disbursements</p>
                                <h3 className="text-4xl font-black text-white font-mono">{formatValue(revenueData.referralEarnings)}</h3>
                                <p className="text-[9px] text-brand-accent uppercase font-bold tracking-widest">1% Network Growth Incentive</p>
                            </div>

                            <div className="p-6 rounded-2xl border-2 border-blue-500/20 bg-blue-950/10 space-y-2">
                                <div className="flex justify-between items-center text-blue-500">
                                    <ChartIcon size={20} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Value Locked (TVL)</p>
                                <h3 className="text-4xl font-black text-white font-mono">{formatValue(revenueData.totalBalances)}</h3>
                                <p className="text-[9px] text-blue-400 uppercase font-bold tracking-widest">Global Escrow Cache</p>
                            </div>
                        </div>

                        {/* Second row of live stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registered Users</p>
                                <h3 className="text-3xl font-black text-white font-mono">{(revenueData.totalUsers || 0).toLocaleString()}</h3>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Unique Firebase Accounts</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Staking Volume</p>
                                <h3 className="text-3xl font-black text-white font-mono">{formatValue(revenueData.stakingStats?.totalVolume || 0)}</h3>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{revenueData.stakingStats?.totalStakes || 0} Total Stakes</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Unsettled Stakes</p>
                                <h3 className="text-3xl font-black text-white font-mono">{(revenueData.stakingStats?.activeStakes || 0).toLocaleString()}</h3>
                                <p className="text-[9px] text-rose-400 uppercase font-bold tracking-widest">Pending Settlement</p>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
                            <SectionHeader icon={<ChartIcon size={18} />} title="Per-Category Revenue & Volume (Live)" />
                            <div className="h-[400px] mt-6 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={revenueData.categoryBreakdown?.length > 0
                                        ? revenueData.categoryBreakdown
                                        : [{ name: 'No Data', revenue: 0, volume: 0 }]
                                    }>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                                        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}
                                        />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue ($)" />
                                        <Bar dataKey="volume" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Volume ($)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
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

function ControlCard({ icon, title, desc, onAction, color, isActive, disabled }) {
    const colors = {
        rose: "border-rose-500 hover:bg-rose-500/10 text-rose-500",
        orange: "border-orange-500 hover:bg-orange-500/10 text-orange-500",
        blue: "border-blue-500 hover:bg-blue-500/10 text-blue-500",
        purple: "border-purple-500 hover:bg-purple-500/10 text-purple-500",
    };

    return (
        <div
            className={cn(
                "p-5 rounded-2xl bg-slate-900 border-2 transition-all space-y-2",
                disabled ? "opacity-50 cursor-not-allowed border-slate-700" : "cursor-pointer group",
                !disabled && isActive && "bg-slate-800 border-white ring-1 ring-white",
                !disabled && !isActive && colors[color]
            )}
            onClick={!disabled ? onAction : undefined}
        >
            <div className="flex items-center justify-between">
                <div className={cn(
                    "p-2 rounded-lg transition-transform",
                    isActive ? "bg-white text-black scale-110" : "bg-slate-800",
                    !disabled && "group-hover:scale-110"
                )}>
                    {React.cloneElement(icon, { size: 20 })}
                </div>
                {!disabled && <ChevronRight size={16} className="text-slate-700 group-hover:text-current transition-colors" />}
            </div>
            <div>
                <h4 className="font-black text-white text-sm uppercase flex items-center gap-2">
                    {title}
                    {isActive && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                </h4>
                <p className="text-slate-500 text-[11px] font-bold leading-tight mt-1">{desc}</p>
            </div>
        </div>
    );
}
