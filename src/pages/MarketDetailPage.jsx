import React, { useState } from 'react';
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
    Shield
} from 'lucide-react';
import { cn } from '../lib/utils';
import { RankingTable } from '../components/RankingTable';
import { LiveTicker } from '../components/LiveTicker';

export function MarketDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { categories, items } = useStore();
    const [activeTab, setActiveTab] = useState('ranking');

    // In a real app, fetch market metadata by ID. Here we find it in current items or default.
    const market = items.find(i => i.id === id) || { name: "Analyzing Market...", score: 0, totalVotes: 0 };

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
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{market.name}</h1>
                            <div className="px-2 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20 text-[10px] font-black text-brand-accent uppercase">Verified Market</div>
                        </div>
                        <p className="text-xs text-slate-500 font-bold max-w-2xl leading-relaxed">
                            A decentralized consensus market measuring the momentum and community sentiment for {market.name}.
                            Settlement is determined by the Star Oracle based on cross-platform data reification.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <StatBox label="Total Volume" value={`${market.totalVotes.toLocaleString()} STARS`} />
                        <StatBox label="Open Interest" value="$12.4k" color="text-brand-accent" />
                        <StatBox label="Settlement" value="T-42m" />
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
                    {activeTab === 'ranking' && <RankingTable />}
                    {activeTab === 'activity' && <MarketActivityFeed />}
                    {activeTab === 'discussion' && <MarketDiscussion />}
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
                                <span className="text-emerald-500">72%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500 w-[72%]" />
                                <div className="h-full bg-rose-500 w-[28%]" />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                                <span>Bearish</span>
                                <span className="text-rose-500">28%</span>
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

function MarketActivityFeed() {
    return (
        <div className="py-20 text-center border-2 border-dashed border-slate-900 rounded-3xl">
            <Activity size={32} className="mx-auto text-slate-800 mb-4" />
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Awaiting Live Ingestion...</p>
        </div>
    );
}

function MarketDiscussion() {
    return (
        <div className="py-20 text-center border-2 border-dashed border-slate-900 rounded-3xl">
            <MessageSquare size={32} className="mx-auto text-slate-800 mb-4" />
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Encrypted Communication Bridge Pending</p>
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
