import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
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
    Lock,
    Loader2,
    Play,
    Pause,
    Eye,
    UserX,
    Camera,
    BarChart3,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/storeModel';

export function AdminPage() {
    const { user, tier, formatValue } = useStore();
    const [isKillswitchArmed, setKillswitchArmed] = useState(false);
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState({ transactions: [], activity: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [actionResult, setActionResult] = useState(null);

    // Fetch system stats on mount
    useEffect(() => {
        fetchSystemStats();
        fetchAuditLogs();
    }, []);

    const fetchSystemStats = async () => {
        try {
            // Fetch both stats and revenue
            const [basicStats, revenueStats] = await Promise.all([
                apiGet("/api/admin/stats"),
                apiGet("/api/admin/revenue")
            ]);
            setStats({ ...basicStats, ...revenueStats });
        } catch (error) {
            console.error('Failed to fetch system stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const data = await apiGet("/api/admin/ledger-audit");
            setAuditLogs(data || { transactions: [], activity: [] });
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        }
    };

    const handleTriggerIngestor = async (ingestorType) => {
        setActionLoading(`ingestor-${ingestorType}`);
        setActionResult(null);
        try {
            // Ingestor endpoints will be added to Express API later
            console.log("Trigger ingestor:", ingestorType);
            setActionResult({ success: true, message: `${ingestorType} ingestor triggered` });
        } catch (error) {
            setActionResult({ success: false, message: error.message });
        } finally {
            setActionLoading(null);
        }
    };

    const handleTriggerSnapshot = async (categorySlug) => {
        setActionLoading(`snapshot-${categorySlug}`);
        setActionResult(null);
        try {
            // Snapshot endpoints will be added to Express API later
            console.log("Trigger snapshot:", categorySlug);
            setActionResult({ success: true, message: `Snapshot triggered for ${categorySlug}` });
        } catch (error) {
            setActionResult({ success: false, message: error.message });
        } finally {
            setActionLoading(null);
        }
    };

    const handleFreezeMarket = async (categorySlug, freeze) => {
        setActionLoading(`freeze-${categorySlug}`);
        setActionResult(null);
        try {
            // Freeze market will be added to Express API later
            console.log("Freeze market:", categorySlug, freeze);
            setActionResult({ success: true, message: `${categorySlug} ${freeze ? 'frozen' : 'unfrozen'}` });
        } catch (error) {
            setActionResult({ success: false, message: error.message });
        } finally {
            setActionLoading(null);
        }
    };

    // --- Seed & Settlement ---
    const [isSeedLoading, setSeedLoading] = useState(false);
    const [seedResult, setSeedResult] = useState(null);
    const [isSettleLoading, setSettleLoading] = useState(false);
    const [settleResult, setSettleResult] = useState(null);

    const handleSeedDatabase = async () => {
        setSeedLoading(true);
        setSeedResult(null);
        try {
            const result = await apiPost("/api/admin/seed");
            setSeedResult({ success: true, message: `Seeded ${result.categories} categories, ${result.items} items` });
        } catch (error) {
            setSeedResult({ success: false, message: error.message });
        } finally {
            setSeedLoading(false);
        }
    };

    const handleSettleStakes = async () => {
        setSettleLoading(true);
        setSettleResult(null);
        try {
            const result = await apiPost("/api/admin/settle");
            setSettleResult({ success: true, message: `Settled ${result.settled} stakes` });
        } catch (error) {
            setSettleResult({ success: false, message: error.message });
        } finally {
            setSettleLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 md:space-y-12 bg-[#020617] min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                            <ShieldAlert size={24} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Ops Overwatch</h1>
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                        Restricted Management Surface • Clearance: {tier}
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => { fetchSystemStats(); fetchAuditLogs(); }}
                        disabled={isLoading}
                        className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-white hover:border-slate-700 transition-all flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Refresh
                    </button>
                    <button
                        onClick={() => setKillswitchArmed(!isKillswitchArmed)}
                        className={cn(
                            "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3",
                            isKillswitchArmed ? "bg-rose-500 text-white animate-pulse" : "bg-slate-900 border border-slate-800 text-rose-500 hover:bg-rose-500/10"
                        )}
                    >
                        <AlertTriangle size={16} /> {isKillswitchArmed ? 'ARMED' : 'Emergency Stop'}
                    </button>
                </div>
            </header>

            {/* Action Result Toast */}
            {actionResult && (
                <div className={cn(
                    "p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2",
                    actionResult.success ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-rose-500/10 border border-rose-500/20"
                )}>
                    {actionResult.success ? <CheckCircle className="text-emerald-500" /> : <XCircle className="text-rose-500" />}
                    <span className={cn("text-xs font-bold uppercase", actionResult.success ? "text-emerald-400" : "text-rose-400")}>
                        {actionResult.message}
                    </span>
                    <button onClick={() => setActionResult(null)} className="ml-auto text-slate-500 hover:text-white">×</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* System Stats */}
                <div className="lg:col-span-1 space-y-4">
                    <AdminStat
                        label="Platform Revenue"
                        value={isLoading ? "..." : formatValue(stats?.platformRevenue || 0)}
                        icon={<DollarSign size={14} />}
                        color="text-brand-accent"
                    />
                    <AdminStat
                        label="Total Volume"
                        value={isLoading ? "..." : formatValue(stats?.stakingStats?.totalVolume || 0)}
                        icon={<TrendingUp size={14} />}
                        color="text-emerald-400"
                    />
                    <AdminStat
                        label="Referral Paid"
                        value={isLoading ? "..." : formatValue(stats?.referralEarnings || 0)}
                        icon={<Users size={14} />}
                        color="text-rose-400"
                    />
                    <AdminStat
                        label="User Balances"
                        value={isLoading ? "..." : formatValue(stats?.totalBalances || 0)}
                        icon={<Database size={14} />}
                        color="text-slate-300"
                    />
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Database & Engine Controls */}
                    <AdminBox title="System Controls" icon={<Database size={16} />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seed Database</h4>
                                <p className="text-[9px] text-slate-500">Populate all categories, items, epoch, and market meta from scratch. Safe to re-run.</p>
                                <button
                                    onClick={handleSeedDatabase}
                                    disabled={isSeedLoading}
                                    className="w-full px-4 py-3 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent font-black text-[10px] uppercase tracking-widest hover:bg-brand-accent/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSeedLoading ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                                    {isSeedLoading ? 'Seeding...' : 'Seed Database'}
                                </button>
                                {seedResult && (
                                    <div className={cn("text-[9px] font-bold uppercase p-2 rounded-lg",
                                        seedResult.success ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                                    )}>
                                        {seedResult.message}
                                    </div>
                                )}
                            </div>
                            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settle Stakes</h4>
                                <p className="text-[9px] text-slate-500">Manually trigger settlement of all expired stakes. Automatic settlement runs on epoch rollover.</p>
                                <button
                                    onClick={handleSettleStakes}
                                    disabled={isSettleLoading}
                                    className="w-full px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-[10px] uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSettleLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                    {isSettleLoading ? 'Settling...' : 'Settle Now'}
                                </button>
                                {settleResult && (
                                    <div className={cn("text-[9px] font-bold uppercase p-2 rounded-lg",
                                        settleResult.success ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                                    )}>
                                        {settleResult.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    </AdminBox>

                    {/* Market Operations */}
                    <AdminBox title="Market Operations" icon={<BarChart3 size={16} />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Performance by Category</h4>
                                <div className="space-y-2">
                                    {(stats?.categoryBreakdown || []).map(cat => (
                                        <div key={cat.name} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex justify-between items-center group hover:bg-slate-900 transition-all">
                                            <div>
                                                <h4 className="text-xs font-black text-white uppercase tracking-tight">{cat.name}</h4>
                                                <span className="text-[9px] text-slate-500 uppercase font-black">Volume: {formatValue(cat.volume)}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-brand-accent italic">{formatValue(cat.revenue)}</p>
                                                <span className="text-[9px] text-slate-600 uppercase font-black">Revenue</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Action Registry</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {['crypto', 'smartphones', 'music', 'lifestyle', 'tech'].map(market => (
                                        <div key={market} className="p-3 px-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase">{market}</h4>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleTriggerSnapshot(market)}
                                                    disabled={actionLoading === `snapshot-${market}`}
                                                    className="p-1.5 rounded-lg bg-brand-accent/5 text-brand-accent hover:bg-brand-accent/20 transition-all"
                                                >
                                                    <Camera size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleFreezeMarket(market, true)}
                                                    disabled={actionLoading === `freeze-${market}`}
                                                    className="p-1.5 rounded-lg bg-amber-500/5 text-amber-500 hover:bg-amber-500/20 transition-all"
                                                >
                                                    <Pause size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </AdminBox>

                    {/* Data Ingestors */}
                    <AdminBox title="Data Ingestors" icon={<RefreshCw size={16} />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { type: 'crypto', name: 'CoinGecko API', status: 'Ready' },
                                { type: 'smartphones', name: 'GSMArena Scraper', status: 'Ready' },
                                { type: 'music', name: 'Billboard API', status: 'Ready' },
                                { type: 'websites', name: 'SimilarWeb API', status: 'Ready' },
                                { type: 'tech', name: 'Crunchbase API', status: 'Ready' }
                            ].map(ingestor => (
                                <IngestorCard
                                    key={ingestor.type}
                                    name={ingestor.name}
                                    type={ingestor.type}
                                    status={ingestor.status}
                                    onTrigger={() => handleTriggerIngestor(ingestor.type)}
                                    isLoading={actionLoading === `ingestor-${ingestor.type}`}
                                />
                            ))}
                        </div>
                    </AdminBox>

                    {/* Financial Ledger Audit */}
                    <AdminBox title="Financial Ledger Audit" icon={<Terminal size={16} />}>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Recent Transactions (Paystack)</h4>
                                <div className="bg-slate-950 rounded-2xl border border-slate-800 divide-y divide-slate-900 overflow-hidden">
                                    {auditLogs?.transactions?.length === 0 ? (
                                        <p className="text-slate-600 text-center py-8 text-[10px] uppercase font-black tracking-widest">No transactions found</p>
                                    ) : (
                                        (auditLogs?.transactions || []).map((tx, i) => (
                                            <div key={tx.id || i} className="p-4 flex justify-between items-center group hover:bg-white/5 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center",
                                                        tx.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                                    )}>
                                                        {tx.status === 'completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-white uppercase">₦{tx.amountNgn?.toLocaleString()}</p>
                                                        <p className="text-[9px] font-mono text-slate-500 uppercase">{tx.reference}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-300">${tx.amountUsd?.toFixed(2)}</p>
                                                    <p className="text-[8px] font-mono text-slate-600 uppercase italic">{new Date(tx.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">System Activity Registry</h4>
                                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-[9px] space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {auditLogs?.activity?.length === 0 ? (
                                        <p className="text-slate-600 text-center py-4 uppercase tracking-[0.2em]">Registry empty</p>
                                    ) : (
                                        (auditLogs?.activity || []).map((log, i) => (
                                            <div key={log.id || i} className="flex gap-3 border-l border-slate-800 pl-3">
                                                <span className="text-slate-600 shrink-0 italic">
                                                    [{new Date(log.createdAt).toLocaleTimeString()}]
                                                </span>
                                                <span className={cn(
                                                    "font-black uppercase",
                                                    log.type === 'deposit' ? "text-emerald-500" : "text-amber-500"
                                                )}>
                                                    {log.type}:
                                                </span>
                                                <span className="text-slate-400">
                                                    {log.description}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
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
        <div className="p-5 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 overflow-hidden">
            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 border-b border-slate-800 pb-4">
                <span className="text-brand-accent">{icon}</span> {title}
            </h2>
            {children}
        </div>
    );
}

function IngestorCard({ name, type, status, onTrigger, isLoading }) {
    return (
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-600 transition-all flex justify-between items-center">
            <div className="space-y-1">
                <h4 className="text-[11px] font-black text-white uppercase">{name}</h4>
                <div className="flex gap-3 text-[9px] font-black uppercase text-slate-500">
                    <span>Type: {type}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-emerald-500/20 text-emerald-500">
                    {status}
                </div>
                <button
                    onClick={onTrigger}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-all"
                >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                </button>
            </div>
        </div>
    );
}
