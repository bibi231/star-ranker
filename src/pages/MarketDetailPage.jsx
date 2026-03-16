import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/storeModel';
import {
    ChevronLeft,
    Activity,
    BarChart2,
    MessageSquare,
    Info,
    Zap,
    TrendingUp,
    Shield,
    Loader2,
    Send,
    Target
} from 'lucide-react';
import { cn, formatTimeAgo } from '../lib/utils';
import { apiGet, apiPost } from '../lib/api';
import { RankingTable } from '../components/RankingTable';
import { LiveTicker } from '../components/LiveTicker';
import toast from 'react-hot-toast';

export function MarketDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { items, formatValue } = useStore();
    const [activeTab, setActiveTab] = useState('ranking');
    const [stats, setStats] = useState({ bullish: 72, bearish: 28, totalVotes: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    const market = items.find(i => i.id === id) || { name: "Analyzing Market...", score: 0, totalVotes: 0 };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiGet(`/api/markets/${id}/stats`);
                setStats(data);
            } catch (err) {
                console.error("Failed to fetch market stats:", err);
            } finally {
                setIsLoadingStats(false);
            }
        };
        fetchStats();
    }, [id]);

    const tabs = [
        { id: 'ranking', label: 'Ranking Table', icon: <BarChart2 size={14} /> },
        { id: 'activity', label: 'Live Activity', icon: <Activity size={14} /> },
        { id: 'discussion', label: 'Discussion', icon: <MessageSquare size={14} /> },
        { id: 'rules', label: 'Oracle Rules', icon: <Info size={14} /> },
    ];

    return (
        <div className="min-h-screen bg-brand-bg flex flex-col">
            {/* Market Header */}
            <div className="p-8 pb-4 space-y-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                >
                    <ChevronLeft size={12} /> Return to Directory
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{market?.name || 'Loading...'}</h1>
                            <div className="px-2 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20 text-[10px] font-black text-brand-accent uppercase">Verified Market</div>
                        </div>
                        <p className="text-xs text-slate-500 font-bold max-w-2xl leading-relaxed">
                            A decentralized consensus market measuring the momentum and community sentiment for {market.name}.
                            Settlement is determined by the Star Oracle based on cross-platform data reification.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <StatBox label="Total Volume" value={`${(market.totalVotes || stats.totalVotes).toLocaleString()} STARS`} />
                        <StatBox label="Active Score" value={market.score?.toLocaleString()} color="text-brand-accent" />
                        <StatBox label="Settlement" value="LIVE" color="text-emerald-400" />
                    </div>
                </div>
            </div>

            {/* Desktop Tabs */}
            <div className="px-8 border-b border-brand-border flex gap-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "pb-4 pt-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2",
                            activeTab === tab.id ? "border-brand-accent text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                        )}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'ranking' && <RankingTable itemId={id} />}
                    {activeTab === 'activity' && <MarketActivityFeed itemId={id} />}
                    {activeTab === 'discussion' && <MarketDiscussion itemId={id} />}
                    {activeTab === 'rules' && <MarketRules />}
                </div>

                {/* Sidebar Widget */}
                <aside className="space-y-6">
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-500" /> Sentiment Bias
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-bold">
                                <span>Bullish</span>
                                <span className="text-emerald-500">{stats.bullish}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.bullish}%` }} />
                                <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${stats.bearish}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                                <span>Bearish</span>
                                <span className="text-rose-500">{stats.bearish}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Shield size={14} className="text-brand-accent" /> Oracle Integrity
                        </h3>
                        <p className="text-[10px] text-slate-400 leading-relaxed italic">
                            "This market is protected by AVD (Anomalous Velocity Detection). Votes that deviate from the weighted mean by &gt;3σ are dampened by the protocol."
                        </p>
                    </div>
                </aside>
            </div>

            <LiveTicker />
        </div>
    );
}

function StatBox({ label, value, color = "text-white" }) {
    return (
        <div className="text-right">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</div>
            <div className={cn("text-lg font-mono font-black leading-none", color)}>{value}</div>
        </div>
    );
}

function MarketActivityFeed({ itemId }) {
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await apiGet(`/api/markets/${itemId}/activity`);
                setActivity(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [itemId]);

    if (loading) return (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-brand-accent" /></div>
    );

    if (activity.length === 0) return (
        <div className="py-20 text-center border-2 border-dashed border-slate-900 rounded-3xl">
            <Activity size={32} className="mx-auto text-slate-800 mb-4" />
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest">No local activity yet</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {activity.map(item => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-2 rounded-lg",
                            item.type === 'vote' ? "text-blue-400 bg-blue-400/5" : "text-emerald-400 bg-emerald-400/5"
                        )}>
                            {item.type === 'vote' ? <Zap size={16} /> : <Target size={16} />}
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-200">
                                <span className="text-brand-accent">{item.userDisplayName || 'Anonymous Oracle'}</span> {item.description}
                            </p>
                            <p className="text-[9px] text-slate-500 uppercase font-black">{formatTimeAgo(item.createdAt)}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function MarketDiscussion({ itemId }) {
    const { user } = useStore();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        try {
            const data = await apiGet(`/api/markets/${itemId}/comments`);
            setComments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [itemId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;
        if (!user) return toast.error("Connect identity to participate");

        setSubmitting(true);
        try {
            await apiPost(`/api/markets/${itemId}/comments`, { content: newComment });
            setNewComment("");
            load();
            toast.success("Intelligence deployed");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-brand-accent" /></div>;

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="relative group">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Contribute to market intelligence..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 pr-16 text-xs text-white focus:outline-none focus:border-brand-accent transition-all min-h-[100px] resize-none"
                />
                <button
                    disabled={submitting}
                    className="absolute bottom-4 right-4 p-2 rounded-xl bg-brand-accent text-[#0D1B2A] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </form>

            <div className="space-y-4">
                {comments.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-slate-900 rounded-3xl">
                        <p className="text-xs font-black text-slate-600 uppercase tracking-widest">No market intelligence shared yet</p>
                    </div>
                ) : comments.map(c => (
                    <div key={c.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-brand-accent uppercase">{c.userDisplayName || 'Anonymous Oracle'}</span>
                            <span className="text-[9px] text-slate-600 uppercase font-black">{formatTimeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{c.content}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MarketRules() {
    return (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Settlement Protocol</h2>
            <div className="space-y-4 text-xs text-slate-400 font-medium leading-relaxed">
                <p>1. The market is resolved by the Star Oracle based on the closing price/rank at the snapshot deadline.</p>
                <p>2. In the event of data unavailability, a 12-hour cooling period is enforced, followed by a community governance vote.</p>
                <p>3. AVD remains active throughout the duration to prevent epochal brigading.</p>
            </div>
        </div>
    );
}
