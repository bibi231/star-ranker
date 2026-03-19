import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, TrendingUp, Shield, BarChart3, ChevronRight, Globe, Lock } from 'lucide-react';
import { LiveTicker } from '../components/LiveTicker';
import { cn } from '../lib/utils';

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#020617] text-white selection:bg-brand-accent/30 overflow-x-hidden">
            {/* Nav Overlay (Landing only) */}
            <nav className="h-20 flex items-center justify-between px-8 md:px-12 max-w-[1440px] mx-auto relative z-50">
                <div className="flex items-center gap-3">
                    <img src="/logo-stacked.png" alt="Star Ranker" className="h-32 w-auto drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
                </div>
                <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <button onClick={() => navigate('/markets')} className="hover:text-white transition-colors">Markets</button>
                    <button onClick={() => navigate('/how-it-works')} className="hover:text-white transition-colors">Oracle Protocol</button>
                    <button onClick={() => navigate('/leaderboards')} className="hover:text-white transition-colors">Beta 2.0</button>
                </div>
                <button
                    onClick={() => navigate('/signin')}
                    className="px-6 py-3 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-brand-accent transition-all shadow-xl shadow-brand-accent/10"
                >
                    Enter Terminal
                </button>
            </nav>

            {/* Hero Section */}
            <main className="relative pt-20 pb-40 px-8 text-center max-w-5xl mx-auto space-y-8">
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-brand-accent tracking-[0.2em] mb-4">
                    <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                    Operational Beta 2.0
                </div>

                <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85]">
                    The World's Largest<br />
                    <span className="text-brand-accent">Consensus Market</span>
                </h1>

                <p className="text-lg md:text-xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                    Stake your reputation on the future. The first server-authoritative ranking platform protected by Anomalous Velocity Detection.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                    <button
                        onClick={() => navigate('/markets')}
                        className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-accent text-slate-950 font-black text-sm uppercase tracking-widest hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-accent/20 flex items-center justify-center gap-3"
                    >
                        Explore Markets <ChevronRight size={18} />
                    </button>
                    <button
                        onClick={() => navigate('/how-it-works')}
                        className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all"
                    >
                        View Whitepaper
                    </button>
                </div>
            </main>

            {/* Feature Grid */}
            <section className="max-w-[1440px] mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-8 pb-40">
                <FeatureCard
                    icon={<TrendingUp className="text-emerald-500" />}
                    title="Proprietary Momentum"
                    desc="Rankings are weighted by historical oracle accuracy and real-time voter velocity."
                />
                <FeatureCard
                    icon={<Shield className="text-brand-accent" />}
                    title="AVD Protection"
                    desc="Advanced bot detection neutralizes brigading attempts via proportional dampening."
                />
                <FeatureCard
                    icon={<Globe className="text-amber-500" />}
                    title="Global Settlement"
                    desc="Deterministic oracle reification triggers every 30 minutes for total transparency."
                />
            </section>

            <div className="fixed bottom-0 left-0 w-full z-50">
                <LiveTicker />
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-brand-accent/50 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">{title}</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{desc}</p>
        </div>
    );
}
