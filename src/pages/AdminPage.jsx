import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
    Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

const functions = getFunctions();

export function AdminPage() {
    const { user, tier } = useStore();
    const [isKillswitchArmed, setKillswitchArmed] = useState(false);
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
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
            const getSystemStats = httpsCallable(functions, 'getSystemStats');
            const result = await getSystemStats();
            setStats(result.data);
        } catch (error) {
            console.error('Failed to fetch system stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const getAuditLogs = httpsCallable(functions, 'getAuditLogs');
            const result = await getAuditLogs({ limit: 20 });
            setAuditLogs(result.data.logs || []);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        }
    };

    const handleTriggerIngestor = async (ingestorType) => {
        setActionLoading(`ingestor-${ingestorType}`);
        setActionResult(null);
        try {
            const triggerIngestor = httpsCallable(functions, 'triggerIngestor');
            await triggerIngestor({ ingestorType });
            setActionResult({ success: true, message: `${ingestorType} ingestor triggered` });
            fetchAuditLogs();
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
            const triggerSnapshot = httpsCallable(functions, 'triggerSnapshot');
            await triggerSnapshot({ categorySlug });
            setActionResult({ success: true, message: `Snapshot triggered for ${categorySlug}` });
            fetchAuditLogs();
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
            const setMarketStatus = httpsCallable(functions, 'setMarketStatus');
            await setMarketStatus({ categorySlug, frozen: freeze, reason: 'Admin action' });
            setActionResult({ success: true, message: `${categorySlug} ${freeze ? 'frozen' : 'unfrozen'}` });
            fetchAuditLogs();
        } catch (error) {
            setActionResult({ success: false, message: error.message });
        } finally {
            setActionLoading(null);
        }
    };

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
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                        Restricted Management Surface • Clearance: {tier}
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => fetchSystemStats()}
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
                        label="Network Status"
                        value={isLoading ? "..." : "Nominal"}
                        icon={<Wifi size={14} />}
                        color="text-emerald-400"
                    />
                    <AdminStat
                        label="Total Users"
                        value={isLoading ? "..." : (stats?.userCount || 0).toLocaleString()}
                        icon={<Users size={14} />}
                        color="text-brand-accent"
                    />
                    <AdminStat
                        label="Markets"
                        value={isLoading ? "..." : stats?.categoryCount || 0}
                        icon={<Database size={14} />}
                        color="text-slate-300"
                    />
                    <AdminStat
                        label="Total Items"
                        value={isLoading ? "..." : (stats?.itemCount || 0).toLocaleString()}
                        icon={<BarChart3 size={14} />}
                        color="text-purple-400"
                    />
                    <AdminStat
                        label="Active Stakes"
                        value={isLoading ? "..." : (stats?.stakeCount || 0).toLocaleString()}
                        icon={<Zap size={14} />}
                        color="text-amber-400"
                    />
                    <AdminStat
                        label="Admin Actions (24h)"
                        value={isLoading ? "..." : stats?.adminActionsToday || 0}
                        icon={<Activity size={14} />}
                        color="text-rose-400"
                    />
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Market Operations */}
                    <AdminBox title="Market Operations" icon={<BarChart3 size={16} />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['crypto', 'smartphones', 'music', 'websites', 'tech'].map(market => (
                                <div key={market} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xs font-black text-white uppercase">{market}</h4>
                                        <span className="text-[9px] text-slate-500">Active Market</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleTriggerSnapshot(market)}
                                            disabled={actionLoading === `snapshot-${market}`}
                                            className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-all"
                                            title="Trigger Snapshot"
                                        >
                                            {actionLoading === `snapshot-${market}` ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                        </button>
                                        <button
                                            onClick={() => handleFreezeMarket(market, true)}
                                            disabled={actionLoading === `freeze-${market}`}
                                            className="p-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all"
                                            title="Freeze Market"
                                        >
                                            {actionLoading === `freeze-${market}` ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
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

                    {/* Audit Log */}
                    <AdminBox title="Security Registry" icon={<Terminal size={16} />}>
                        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-[10px] space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                            {auditLogs.length === 0 ? (
                                <p className="text-slate-600 text-center py-4">No audit logs available</p>
                            ) : (
                                auditLogs.map((log, i) => (
                                    <div key={log.id || i} className="flex gap-3">
                                        <span className="text-slate-600 shrink-0">
                                            [{new Date(log.timestamp).toLocaleTimeString()}]
                                        </span>
                                        <span className={cn(
                                            log.success ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            {log.action}:
                                        </span>
                                        <span className="text-slate-400">
                                            {log.targetType}/{log.targetId} by {log.actorEmail?.split('@')[0]}
                                        </span>
                                    </div>
                                ))
                            )}
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
