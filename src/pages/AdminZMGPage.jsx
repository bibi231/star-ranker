import { useState, useEffect } from "react";
import {
    Zap, RefreshCw, AlertTriangle, CheckCircle,
    Play, Clock, Database, TrendingUp, FileText,
    ChevronDown, ChevronUp, Activity
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

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
            // Load ZMG stats
            const getZMGStats = httpsCallable(functions, "getZMGStats");
            const statsResult = await getZMGStats();
            setStats(statsResult.data);

            // Load recent runs
            const getZMGRuns = httpsCallable(functions, "getZMGRuns");
            const runsResult = await getZMGRuns({ limit: 20 });
            setRuns(runsResult.data.runs || []);
        } catch (err) {
            console.error("Failed to load ZMG data:", err);
            setError("Failed to load ZMG data. Make sure Cloud Functions are deployed.");
        } finally {
            setLoading(false);
        }
    };

    const triggerZMG = async (marketId) => {
        setTriggering(true);
        setError(null);

        try {
            const trigger = httpsCallable(functions, "triggerZMG");
            await trigger({ marketId });

            // Reload data after trigger
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
            case "completed": return "text-green-400";
            case "running": return "text-yellow-400";
            case "failed": return "text-red-400";
            default: return "text-gray-400";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "completed": return <CheckCircle className="w-5 h-5 text-green-400" />;
            case "running": return <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />;
            case "failed": return <AlertTriangle className="w-5 h-5 text-red-400" />;
            default: return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl">
                            <Zap className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Zeitgeist Market Generator</h1>
                            <p className="text-gray-400">AI-powered market item discovery and scoring</p>
                        </div>
                    </div>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <p className="text-red-200">{error}</p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={Activity}
                        label="Total Runs"
                        value={stats?.totalRuns || 0}
                        color="purple"
                    />
                    <StatCard
                        icon={Database}
                        label="Items Discovered"
                        value={stats?.totalItemsDiscovered || 0}
                        color="blue"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Items Added"
                        value={stats?.totalItemsAdded || 0}
                        color="green"
                    />
                    <StatCard
                        icon={FileText}
                        label="Avg per Run"
                        value={stats?.avgItemsPerRun || 0}
                        color="yellow"
                    />
                </div>

                {/* Quick Actions */}
                <div className="mb-8 p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                    <div className="flex flex-wrap gap-4">
                        {["crypto", "smartphones", "music", "websites", "tech"].map(market => (
                            <button
                                key={market}
                                onClick={() => triggerZMG(market)}
                                disabled={triggering}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-all disabled:opacity-50"
                            >
                                {triggering ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                Run ZMG: {market.charAt(0).toUpperCase() + market.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Runs */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Recent Runs</h2>
                    </div>

                    {runs.length === 0 ? (
                        <div className="p-12 text-center">
                            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No ZMG runs yet</p>
                            <p className="text-gray-500 text-sm mt-1">
                                Deploy Cloud Functions and trigger a run to get started
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700">
                            {runs.map((run) => (
                                <div key={run.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {getStatusIcon(run.status)}
                                            <div>
                                                <p className="font-medium text-white">
                                                    {run.marketSlug || run.marketId}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    {formatDate(run.startedAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className={`font-medium ${getStatusColor(run.status)}`}>
                                                    {run.status?.toUpperCase()}
                                                </p>
                                                {run.stats && (
                                                    <p className="text-sm text-gray-400">
                                                        +{run.stats.itemsAdded} items
                                                    </p>
                                                )}
                                            </div>
                                            {expandedRun === run.id ? (
                                                <ChevronUp className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedRun === run.id && run.stats && (
                                        <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-2 md:grid-cols-5 gap-4">
                                            <DetailItem label="Discovered" value={run.stats.itemsDiscovered} />
                                            <DetailItem label="Added" value={run.stats.itemsAdded} />
                                            <DetailItem label="Updated" value={run.stats.itemsUpdated} />
                                            <DetailItem label="Archived" value={run.stats.itemsArchived} />
                                            <DetailItem label="Signals" value={run.stats.signalsFetched} />
                                            {run.stats.errors?.length > 0 && (
                                                <div className="col-span-full mt-2">
                                                    <p className="text-red-400 text-sm">
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
                </div>

                {/* Info Card */}
                <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                    <h3 className="text-lg font-bold text-blue-400 mb-2">How ZMG Works</h3>
                    <ul className="space-y-2 text-gray-300 text-sm">
                        <li>• <strong>Discovery:</strong> Fetches items from Wikipedia, Reddit, and other sources</li>
                        <li>• <strong>Scoring:</strong> Calculates Zeitgeist score based on search trends, social velocity, and debatability</li>
                        <li>• <strong>Balancing:</strong> Maintains 100-300 items per market, adding new and archiving stale</li>
                        <li>• <strong>Decay:</strong> Items naturally decay if they stop receiving signals</li>
                        <li>• <strong>Schedule:</strong> Runs automatically every 12 hours</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }) {
    const colors = {
        purple: "from-purple-600 to-purple-800",
        blue: "from-blue-600 to-blue-800",
        green: "from-green-600 to-green-800",
        yellow: "from-yellow-600 to-yellow-800",
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 bg-gradient-to-br ${colors[color]} rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">{label}</p>
                </div>
            </div>
        </div>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
        </div>
    );
}
