import { useState, useEffect } from "react";
import {
    Zap, RefreshCw, AlertTriangle, CheckCircle,
    Play, Clock, Database, TrendingUp, FileText,
    ChevronDown, ChevronUp, Activity, Loader2
} from "lucide-react";
import { apiGet, apiPost } from "../lib/api";
import { cn } from "../lib/utils";

/**
 * Zeitgeist Market Generator Admin Dashboard
 * 
 * Allows admins to monitor and control the ZMG system.
 */

export default function AdminZMGPage() {
    const [stats, setStats] = useState(null);
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [expandedRun, setExpandedRun] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // ZMG endpoints will be added to Express API later
            // For now, show placeholder data
            setStats({ totalRuns: 0, successRate: 0, lastRun: null, activeMarkets: 0 });
            setRuns([]);
        } catch (err) {
            console.error("Failed to load ZMG data:", err);
            setError("Failed to load ZMG data. Make sure the API server is running.");
        } finally {
            setLoading(false);
        }
    };

    const triggerZMG = async (marketId) => {
        setTriggering(true);
        setError(null);

        try {
            // ZMG trigger will be added to Express API later
            console.log("ZMG trigger for:", marketId);
            setTimeout(loadData, 2000);
        } catch (err) {
            console.error("Failed to trigger ZMG:", err);
            setError("Failed to trigger ZMG. Check console for details.");
        } finally {
            setTriggering(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "Never";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
        return date.toLocaleString();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "completed": return "text-emerald-400";
            case "running": return "text-amber-400";
            case "failed": return "text-rose-400";
            default: return "text-slate-400";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "completed": return <CheckCircle className="w-5 h-5 text-emerald-400" />;
            case "running": return <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />;
            case "failed": return <AlertTriangle className="w-5 h-5 text-rose-400" />;
            default: return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 md:space-y-12 bg-[#020617] min-h-screen">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-brand-accent/10 text-brand-accent">
                            <Zap size={24} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Zeitgeist Market Generator</h1>
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                        AI-powered market item discovery and scoring
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-white hover:border-slate-700 transition-all flex items-center gap-2"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Refresh
                </button>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <p className="text-xs font-bold text-rose-400 uppercase">{error}</p>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={Activity} label="Total Runs" value={stats?.totalRuns || 0} color="brand-accent" />
                <StatCard icon={Database} label="Items Discovered" value={stats?.totalItemsDiscovered || 0} color="blue" />
                <StatCard icon={TrendingUp} label="Items Added" value={stats?.totalItemsAdded || 0} color="emerald" />
                <StatCard icon={FileText} label="Avg per Run" value={stats?.avgItemsPerRun || 0} color="amber" />
            </div>

            {/* Quick Actions */}
            <ZMGBox title="Quick Actions" icon={<Play size={16} />}>
                <div className="flex flex-wrap gap-3">
                    {["crypto", "smartphones", "music", "websites", "tech"].map(market => (
                        <button
                            key={market}
                            onClick={() => triggerZMG(market)}
                            disabled={triggering}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                                triggering
                                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                    : "bg-brand-accent text-slate-950 hover:bg-white hover:scale-105 active:scale-95 shadow-lg shadow-brand-accent/10"
                            )}
                        >
                            {triggering ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            Run ZMG: {market.charAt(0).toUpperCase() + market.slice(1)}
                        </button>
                    ))}
                </div>
            </ZMGBox>

            {/* Recent Runs */}
            <ZMGBox title="Recent Runs" icon={<Activity size={16} />}>
                {runs.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-slate-900 rounded-3xl">
                        <Clock className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">No ZMG runs yet</p>
                        <p className="text-[10px] text-slate-600 mt-1 uppercase">
                            Deploy Cloud Functions and trigger a run to get started
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/50">
                        {runs.map((run) => (
                            <div key={run.id} className="py-4 hover:bg-slate-800/20 transition-colors rounded-xl px-2">
                                <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        {getStatusIcon(run.status)}
                                        <div>
                                            <p className="text-xs font-black text-white uppercase">
                                                {run.marketSlug || run.marketId}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                                {formatDate(run.startedAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className={cn("text-[10px] font-black uppercase tracking-widest", getStatusColor(run.status))}>
                                                {run.status?.toUpperCase()}
                                            </p>
                                            {run.stats && (
                                                <p className="text-[10px] font-mono text-slate-500">
                                                    +{run.stats.itemsAdded} items
                                                </p>
                                            )}
                                        </div>
                                        {expandedRun === run.id ? (
                                            <ChevronUp className="w-5 h-5 text-slate-600" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-slate-600" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedRun === run.id && run.stats && (
                                    <div className="mt-4 pt-4 border-t border-slate-800/50 grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <DetailItem label="Discovered" value={run.stats.itemsDiscovered} />
                                        <DetailItem label="Added" value={run.stats.itemsAdded} />
                                        <DetailItem label="Updated" value={run.stats.itemsUpdated} />
                                        <DetailItem label="Archived" value={run.stats.itemsArchived} />
                                        <DetailItem label="Signals" value={run.stats.signalsFetched} />
                                        {run.stats.errors?.length > 0 && (
                                            <div className="col-span-full mt-2">
                                                <p className="text-rose-400 text-[10px] font-bold uppercase">
                                                    Errors: {run.stats.errors.join(", ")}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ZMGBox>

            {/* Info Card */}
            <div className="p-8 rounded-3xl bg-slate-900 border border-brand-accent/20 shadow-xl space-y-4">
                <h3 className="text-xs font-black text-brand-accent uppercase tracking-[0.2em]">How ZMG Works</h3>
                <ul className="space-y-3 text-slate-400 text-[11px] font-medium leading-relaxed">
                    <li>• <strong className="text-white">Discovery:</strong> Fetches items from Wikipedia, Reddit, and other sources</li>
                    <li>• <strong className="text-white">Scoring:</strong> Calculates Zeitgeist score based on search trends, social velocity, and debatability</li>
                    <li>• <strong className="text-white">Balancing:</strong> Maintains 100-300 items per market, adding new and archiving stale</li>
                    <li>• <strong className="text-white">Decay:</strong> Items naturally decay if they stop receiving signals</li>
                    <li>• <strong className="text-white">Schedule:</strong> Runs automatically every 12 hours</li>
                </ul>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }) {
    const iconColors = {
        "brand-accent": "text-brand-accent",
        blue: "text-blue-400",
        emerald: "text-emerald-400",
        amber: "text-amber-400",
    };

    return (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex justify-between items-center group hover:border-slate-700 transition-all">
            <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Icon size={14} className={iconColors[color]} /> {label}
                </p>
                <p className={cn("text-xl font-mono font-black italic", iconColors[color])}>{value.toLocaleString()}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
    );
}

function ZMGBox({ title, icon, children }) {
    return (
        <div className="p-5 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 border-b border-slate-800 pb-4">
                <span className="text-brand-accent">{icon}</span> {title}
            </h2>
            {children}
        </div>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-lg font-mono font-black text-white">{value}</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{label}</p>
        </div>
    );
}
