import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Key, Database, Globe, Play, Copy, CheckCircle2, Server, Lock, Activity, Users, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/storeModel';

const ENDPOINTS = [
    {
        id: 'stats',
        method: 'GET',
        path: '/api/stats/public',
        title: 'Platform Statistics',
        desc: 'Retrieve aggregated platform statistics including total volume and active Oracles.',
        icon: Activity,
        response: {
            success: true,
            data: {
                totalVolume: 42500000,
                activeOracles: 1245,
                openMarkets: 32,
                lastUpdated: "2026-03-31T20:00:00Z"
            }
        }
    },
    {
        id: 'markets',
        method: 'GET',
        path: '/api/markets/public-preview',
        title: 'Markets Directory',
        desc: 'Lists all available markets, categories, and current trading volume parameters.',
        icon: Database,
        response: {
            success: true,
            data: [
                {
                    categoryId: "tech",
                    name: "African Tech Valuation",
                    items: 45,
                    volumeNgn: 12500000
                },
                {
                    categoryId: "entertainment",
                    name: "Nollywood Awards 2026",
                    items: 12,
                    volumeNgn: 8900000
                }
            ]
        }
    },
    {
        id: 'leaderboard',
        method: 'GET',
        path: '/api/leaderboard/public',
        title: 'Global Leaderboard',
        desc: 'Returns the top ranking Oracles based on reputation and successful deployments.',
        icon: Users,
        response: {
            success: true,
            data: [
                {
                    rank: 1,
                    oracleHandle: "QuantumTrader",
                    reputation: 15420,
                    tier: "diamond"
                },
                {
                    rank: 2,
                    oracleHandle: "LagosAlpha",
                    reputation: 14890,
                    tier: "diamond"
                }
            ]
        }
    }
];

export function APIDocsPage() {
    const [activeEndpoint, setActiveEndpoint] = useState(ENDPOINTS[0].id);
    const [isGenerating, setIsGenerating] = useState(false);
    const [apiKey, setApiKey] = useState(null);
    const [copied, setCopied] = useState(false);
    const [testing, setTesting] = useState(false);

    const active = ENDPOINTS.find(e => e.id === activeEndpoint);

    const handleGenerateKey = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setApiKey(`sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`);
            setIsGenerating(false);
        }, 1500);
    };

    const handleCopy = () => {
        if (!apiKey) return;
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const runTest = () => {
        setTesting(true);
        setTimeout(() => {
            setTesting(false);
        }, 800);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-slate-300 font-sans mt-16">
            
            {/* Sidebar Navigation */}
            <div className="w-80 border-r border-slate-800/60 bg-slate-900/50 flex flex-col h-full transform transition-all overflow-y-auto hidden md:flex">
                <div className="p-6 border-b border-slate-800/60 sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3 text-brand-accent mb-2">
                        <Terminal size={20} />
                        <h2 className="font-black text-sm uppercase tracking-widest font-mono">Dev Sandbox</h2>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
                        Access raw oracle data via high-performance REST APIs.
                    </p>
                </div>

                <div className="flex-1 p-4 space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-4 px-2">Public Endpoints</p>
                    {ENDPOINTS.map(endpoint => {
                        const Icon = endpoint.icon;
                        const isActive = activeEndpoint === endpoint.id;
                        return (
                            <button
                                key={endpoint.id}
                                onClick={() => setActiveEndpoint(endpoint.id)}
                                className={cn(
                                    "w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer group",
                                    isActive ? "bg-brand-accent/10 border border-brand-accent/20" : "hover:bg-slate-800/40 border border-transparent"
                                )}
                            >
                                <Icon size={16} className={isActive ? "text-brand-accent" : "text-slate-500 group-hover:text-slate-400"} />
                                <div className="flex flex-col">
                                    <span className={cn("text-xs font-black tracking-wide uppercase", isActive ? "text-brand-accent relative" : "text-slate-400 group-hover:text-slate-300")}>
                                        {endpoint.title}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-600 group-hover:text-slate-500">{endpoint.path}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                <div className="mt-auto p-6 border-t border-slate-800/60 bg-slate-900/30">
                    <p className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">Authentication</p>
                    <button 
                        onClick={handleGenerateKey}
                        disabled={isGenerating || !!apiKey}
                        className={cn(
                            "w-full py-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all mb-3",
                            apiKey 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-brand-accent/50"
                        )}
                    >
                        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                        {apiKey ? 'Provisioned' : 'Generate Dev Key'}
                    </button>
                    
                    {apiKey && (
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between group">
                            <span className="font-mono text-[10px] text-slate-500 truncate w-[80%] select-all">{apiKey}</span>
                            <button onClick={handleCopy} className="text-slate-600 hover:text-brand-accent transition-colors">
                                {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                
                {/* Documentation Section */}
                <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-24 border-r border-slate-800/60 custom-scrollbar">
                    <motion.div
                        key={active.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-black tracking-widest leading-none flex items-center mt-1">
                                {active.method}
                            </span>
                            <span className="font-mono text-lg text-slate-300 font-bold">{active.path}</span>
                        </div>
                        
                        <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">{active.title}</h1>
                        <p className="text-slate-400 leading-relaxed mb-10 text-sm md:text-base border-l-2 border-brand-accent/50 pl-4 py-1 italic">
                            {active.desc}
                        </p>

                        <div className="prose prose-invert prose-sm md:prose-base max-w-none">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Request Headers</h3>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8 shadow-2xl">
                                <table className="w-full text-left font-mono text-xs m-0">
                                    <thead>
                                        <tr className="bg-slate-800/50">
                                            <th className="py-3 px-6 font-bold text-slate-400 w-1/3">Header Component</th>
                                            <th className="py-3 px-6 font-bold text-slate-400">Assignment Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        <tr className="hover:bg-slate-800/20 transition-colors">
                                            <td className="py-4 px-6 text-brand-accent font-black">Authorization</td>
                                            <td className="py-4 px-6 text-slate-500">Bearer &lt;API_KEY&gt; <span className="text-[9px] uppercase tracking-widest opacity-50 ml-2">(Optional for public endpoints)</span></td>
                                        </tr>
                                        <tr className="hover:bg-slate-800/20 transition-colors">
                                            <td className="py-4 px-6 text-brand-accent font-black">Content-Type</td>
                                            <td className="py-4 px-6 text-slate-500">application/json</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 mt-8">Response Model</h3>
                            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                                Executing this route successfully returns a standardized JSON payload structure. Contains a top-level execution status boolean and a mapped data structure corresponding to the queried oracle dataset.
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* API Sandbox / Terminal Section */}
                <div className="w-full md:w-[450px] bg-[#0a0f18] flex flex-col text-slate-300 font-mono text-xs border-t md:border-t-0 border-slate-800/60 z-20 shadow-2xl relative">
                    <div className="h-12 border-b border-slate-800/60 bg-[#0f1520] flex items-center justify-between px-4 sticky top-0 z-10 shrink-0">
                        <div className="flex items-center gap-2">
                            <Server size={14} className="text-slate-500" />
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Network Interceptor // Sandbox</span>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-brand-accent/50 shadow-[0_0_8px_rgba(56,189,248,0.5)] animate-pulse" />
                        </div>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto relative custom-scrollbar">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-800/30 pb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                <span className="text-emerald-400 font-black tracking-widest text-[10px] uppercase">HTTP/2 200 OK</span>
                            </div>
                            <button 
                                onClick={runTest}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent rounded border border-brand-accent/30 transition-all font-black"
                            >
                                {testing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                                EXECUTE
                            </button>
                        </div>
                        
                        <div className="bg-[#05080f] border border-slate-800/80 rounded-xl p-6 overflow-x-auto shadow-inner relative">
                             <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                <Activity size={64} />
                             </div>
                            
                            {testing ? (
                                <div className="text-slate-600 flex flex-col gap-3 font-bold">
                                    <span className="text-brand-accent/50">&gt; Authenticating connection pool...</span>
                                    <span>&gt; Resolving routing table for {active.path} ...</span>
                                    <span>&gt; Bypassing edge cache...</span>
                                    <span className="text-emerald-500/70 animate-pulse">&gt; Receiving payload blocks...</span>
                                </div>
                            ) : (
                                <motion.pre 
                                    className="text-emerald-400 leading-relaxed text-[11px] font-black"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    key={active.id}
                                >
                                    {JSON.stringify(active.response, null, 2)}
                                </motion.pre>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
