import React from 'react';
import { Code, Server, Key, Zap, Shield, Clock, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function APIDocsPage() {
    return (
        <div className="min-h-screen bg-[#020617] p-8 md:p-16">
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-4 border-b border-slate-800 pb-12">
                    <div className="flex items-center gap-6">
                        <div className="p-4 rounded-3xl bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-xl shadow-brand-accent/5">
                            <Code size={48} />
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">API Documentation</h1>
                    </div>
                    <p className="text-slate-400 text-sm font-medium max-w-2xl">
                        Integrate with the Star Ranker protocol via our REST API. All endpoints return JSON and follow standard HTTP conventions.
                    </p>
                </header>

                {/* Base URL */}
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Server size={20} className="text-brand-accent" /> Base URL
                    </h2>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-emerald-400">
                        https://star-ranker.onrender.com/api
                    </div>
                </div>

                {/* Authentication */}
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Key size={20} className="text-brand-accent" /> Authentication
                    </h2>
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Authenticated endpoints require a Firebase ID token in the <code className="text-brand-accent bg-slate-950 px-2 py-0.5 rounded">Authorization</code> header.
                        </p>
                        <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto">
                            <pre>{`Authorization: Bearer <firebase_id_token>`}</pre>
                        </div>
                    </div>
                </div>

                {/* Endpoints */}
                <div className="space-y-6">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Zap size={20} className="text-brand-accent" /> Endpoints
                    </h2>

                    <EndpointCard method="GET" path="/categories" desc="List all ranking categories." auth={false} />
                    <EndpointCard method="GET" path="/items/:categorySlug" desc="Get ranked items for a category. Supports query params: filter (all|gainers|losers|sleepers)." auth={false} />
                    <EndpointCard method="GET" path="/epochs/current" desc="Get the currently active epoch with countdown timer." auth={false} />
                    <EndpointCard method="GET" path="/epochs/:epochNumber/snapshots" desc="Retrieve immutable ranking snapshots for a completed epoch." auth={false} />
                    <EndpointCard method="POST" path="/votes" desc="Cast a vote on an item. Body: { itemId, direction (1 or -1) }." auth={true} />
                    <EndpointCard method="POST" path="/stakes" desc="Deploy a prediction stake. Body: { itemId, predictedRank, amount }." auth={true} />
                    <EndpointCard method="GET" path="/leaderboard" desc="Get top-ranked oracles by reputation. Query: ?limit=20." auth={false} />
                    <EndpointCard method="GET" path="/activity" desc="Recent platform activity feed." auth={false} />
                    <EndpointCard method="GET" path="/user/profile" desc="Get authenticated user's profile, balance, and tier." auth={true} />
                    <EndpointCard method="GET" path="/health" desc="API health check. Returns { status: 'ok', timestamp }." auth={false} />
                </div>

                {/* Rate Limits */}
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Shield size={20} className="text-brand-accent" /> Rate Limits
                    </h2>
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <RateLimitCard scope="Global" limit="10,000 req / 15 min" />
                            <RateLimitCard scope="Staking" limit="5,000 req / 15 min" />
                            <RateLimitCard scope="Admin" limit="5,000 req / 15 min" />
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-amber-400 text-sm font-bold flex items-center gap-2">
                        <Clock size={16} />
                        Beta Notice: API endpoints and rate limits may change during the beta period.
                    </p>
                </div>
            </div>
        </div>
    );
}

function EndpointCard({ method, path, desc, auth }) {
    const methodColors = {
        GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        PUT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        DELETE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };

    return (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
                <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase border", methodColors[method])}>
                    {method}
                </span>
                <code className="text-sm font-mono text-white font-bold">{path}</code>
            </div>
            <p className="text-xs text-slate-500 flex-1">{desc}</p>
            {auth && (
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 shrink-0">
                    Auth Required
                </span>
            )}
        </div>
    );
}

function RateLimitCard({ scope, limit }) {
    return (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">{scope}</p>
            <p className="text-sm font-mono font-black text-white">{limit}</p>
        </div>
    );
}

export default APIDocsPage;
