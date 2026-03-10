import React, { useState, useEffect } from 'react';
import {
    Activity,
    Award,
    Info,
    ShieldCheck,
    Clock,
    Zap,
    Scale,
    FileText,
    Lock,
    Search,
    TrendingUp,
    Users,
    Target,
    AlertTriangle,
    BarChart3,
    Shield,
    Eye,
    Calculator,
    Coins,
    BookOpen,
    ArrowRight,
    Loader2,
    Trophy
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { apiGet } from '../lib/api';

export function ActivityPage() {
    return (
        <div className="p-8 space-y-8 bg-[#020617] min-h-screen">
            <header className="space-y-2">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Market Pulse</h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Real-time influence log from the global ranker network.</p>
            </header>

            <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex justify-between items-center group hover:border-brand-accent/30 transition-all">
                        <div className="flex items-center gap-6">
                            <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                                <Activity size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white uppercase tracking-tight">
                                    Oracle_{800 + i} <span className="text-slate-500 font-bold">deployed influence on</span> Bitcoin
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[9px] font-mono text-emerald-500 font-black uppercase">VOTE_UP</span>
                                    <span className="text-[9px] font-mono text-slate-600">TXID: 0x{Math.random().toString(16).slice(2, 10)}</span>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">{i * 2} minutes ago</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function LeaderboardPage() {
    const [leaders, setLeaders] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        setIsLoading(true);
        try {
            const [leaderData, statsData] = await Promise.all([
                apiGet("/api/leaderboard", { limit: "20" }).catch(() => []),
                apiGet("/api/leaderboard/stats").catch(() => null),
            ]);
            setLeaders(leaderData);
            setStats(statsData);
        } catch (err) {
            console.error("Leaderboard load error:", err);
        }
        setIsLoading(false);
    };

    const tierColor = (tier) => {
        switch (tier) {
            case "Oracle": return "text-amber-400";
            case "Sage": return "text-purple-400";
            case "Peer": return "text-blue-400";
            default: return "text-slate-400";
        }
    };

    return (
        <div className="p-8 space-y-12 bg-[#020617] min-h-screen">
            <header className="space-y-2">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <Trophy className="text-amber-400" size={36} />
                    Oracle Rankings
                </h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">The most accurate predictors in the Star Ranker ecosystem.</p>
            </header>

            {/* Platform Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                        <div className="text-2xl font-mono font-black text-white">{stats.totalUsers?.toLocaleString() || 0}</div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Total Oracles</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                        <div className="text-2xl font-mono font-black text-brand-accent">{stats.totalStakes?.toLocaleString() || 0}</div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Total Stakes</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                        <div className="text-2xl font-mono font-black text-emerald-400">${stats.totalWagered?.toLocaleString() || 0}</div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Total Wagered</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                        <div className="text-2xl font-mono font-black text-amber-400">${stats.totalWon?.toLocaleString() || 0}</div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Total Won</div>
                    </div>
                </div>
            )}

            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="px-8 py-4 w-24 text-center">Rank</th>
                            <th className="px-8 py-4">Oracle Identity</th>
                            <th className="px-8 py-4 text-right">Tier</th>
                            <th className="px-8 py-4 text-right">Reputation</th>
                            <th className="px-8 py-4 text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {isLoading ? (
                            <tr>
                                <td colSpan="5" className="px-8 py-20 text-center">
                                    <Loader2 size={32} className="animate-spin text-brand-accent mx-auto" />
                                    <p className="text-[10px] text-slate-500 uppercase mt-4">Loading rankings...</p>
                                </td>
                            </tr>
                        ) : leaders.length > 0 ? leaders.map(user => (
                            <tr key={user.rank} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-8 py-5 text-center">
                                    <span className={cn(
                                        "font-mono text-base font-black italic",
                                        user.rank <= 3 ? "text-amber-400" : "text-slate-500"
                                    )}>
                                        #{user.rank}
                                    </span>
                                </td>
                                <td className="px-8 py-5 flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center",
                                        user.rank <= 3 ? "text-amber-400 border-amber-500/20" : "text-brand-accent"
                                    )}>
                                        <Award size={20} />
                                    </div>
                                    <span className="font-black text-white uppercase tracking-tight">
                                        {user.displayName || `Oracle_${user.rank}`}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <span className={cn("text-[10px] font-black uppercase px-3 py-1 rounded-full border", tierColor(user.tier),
                                        user.tier === "Oracle" ? "bg-amber-500/10 border-amber-500/20" :
                                            user.tier === "Sage" ? "bg-purple-500/10 border-purple-500/20" :
                                                user.tier === "Peer" ? "bg-blue-500/10 border-blue-500/20" :
                                                    "bg-slate-800 border-slate-700"
                                    )}>
                                        {user.tier}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right font-mono text-sm font-black text-slate-100 italic">
                                    {(user.reputation || 0).toLocaleString()}
                                </td>
                                <td className="px-8 py-5 text-right font-mono text-sm font-black text-emerald-400">
                                    ${(user.balance || 0).toLocaleString()}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="px-8 py-20 text-center">
                                    <Users size={40} className="text-slate-700 mx-auto" />
                                    <p className="text-[10px] text-slate-500 uppercase mt-4">No oracles yet. Be the first!</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


// ============================================
// HOW IT WORKS - User-facing explanation
// ============================================
export function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-[#020617] p-8 md:p-16">
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-4 border-b border-slate-800 pb-12">
                    <div className="flex items-center gap-6">
                        <div className="p-4 rounded-3xl bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-xl shadow-brand-accent/5">
                            <BookOpen size={48} />
                        </div>
                        <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">How It Works</h1>
                    </div>
                    <p className="text-slate-400 text-sm font-medium max-w-2xl">
                        Star Ranker is a real-time ranking and staking platform where your predictions shape the market.
                    </p>
                </header>

                {/* Step-by-step guide */}
                <div className="space-y-8">
                    <StepCard
                        number={1}
                        icon={<Users size={24} />}
                        title="Create Your Oracle Identity"
                        description="Sign up and verify your email to establish your Oracle identity. Your reputation starts at Newbie and grows with accurate predictions."
                    />
                    <StepCard
                        number={2}
                        icon={<TrendingUp size={24} />}
                        title="Explore Markets"
                        description="Browse categories like Crypto, Tech Giants, Smartphones, and more. Each market contains items ranked by community sentiment."
                    />
                    <StepCard
                        number={3}
                        icon={<Zap size={24} />}
                        title="Cast Your Influence"
                        description="Vote on items to influence their ranking. Your vote weight depends on your Oracle tier — higher tiers have more influence."
                    />
                    <StepCard
                        number={4}
                        icon={<Target size={24} />}
                        title="Stake Your Prediction"
                        description="Believe an item will reach a specific rank? Deploy capital to back your prediction. Accurate predictions earn multiplied returns."
                    />
                    <StepCard
                        number={5}
                        icon={<Coins size={24} />}
                        title="Collect Your Payout"
                        description="When the market settles (every 30 minutes), the Oracle compares actual ranks to predictions. Exact matches earn 5x, close calls earn 1.5x."
                    />
                </div>

                {/* Tier System */}
                <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Award className="text-brand-accent" /> Oracle Tier System
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <TierCard tier="Newbie" influence="1x" requirement="New account" color="text-slate-400" />
                        <TierCard tier="Peer" influence="1.5x" requirement="Email verified" color="text-blue-400" />
                        <TierCard tier="Sage" influence="2x" requirement="500+ reputation" color="text-purple-400" />
                        <TierCard tier="Oracle" influence="5x" requirement="10,000+ reputation" color="text-amber-400" />
                    </div>
                </div>

                {/* Quick FAQ */}
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">Quick Questions</h2>
                    <FAQItem
                        question="How often do rankings update?"
                        answer="Rankings reify every 30 minutes in an 'Epoch'. Votes cast during an epoch affect the next settlement."
                    />
                    <FAQItem
                        question="Can I lose my stake?"
                        answer="Yes. If the item doesn't reach your predicted rank, you lose the staked amount. Only stake what you can afford to lose."
                    />
                    <FAQItem
                        question="How do I increase my tier?"
                        answer="Earn reputation through accurate voting and successful stake predictions. Higher accuracy = faster progression."
                    />
                </div>
            </div>
        </div>
    );
}

// ============================================
// TRANSPARENCY - Technical & Risk Disclosure
// ============================================
export function TransparencyPage() {
    return (
        <div className="min-h-screen bg-[#020617] p-8 md:p-16">
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-4 border-b border-slate-800 pb-12">
                    <div className="flex items-center gap-6">
                        <div className="p-4 rounded-3xl bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-xl shadow-brand-accent/5">
                            <ShieldCheck size={48} />
                        </div>
                        <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">System Transparency</h1>
                    </div>
                    <p className="text-slate-400 text-sm font-medium max-w-2xl">
                        Full disclosure of algorithms, anti-manipulation measures, settlement logic, and risk factors.
                    </p>
                </header>

                {/* Algorithm Section */}
                <div className="space-y-6">
                    <SectionHeader title="Ranking Algorithm (MWR)" icon={<Calculator size={20} />} />
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Star Ranker uses <strong className="text-white">Momentum-Weighted Ranking (MWR)</strong>, a physics-inspired algorithm
                            where votes act as forces that accelerate items up or down the rankings.
                        </p>
                        <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto">
                            <pre>{`Score = Baseline + (Momentum × 0.1)
Momentum(t) = Momentum(t-1) × e^(-γ × Δt) + VoteVelocity
VoteVelocity = (Weight × Direction) / Viscosity

Where:
  γ (decay constant) = 0.05
  Viscosity = 1.0 (default)`}</pre>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                            Momentum decays exponentially — old votes lose influence over time, keeping rankings fresh.
                        </p>
                    </div>
                </div>

                {/* AVD Anti-Bot */}
                <div className="space-y-6">
                    <SectionHeader title="Anti-Bot Logic (AVD)" icon={<Shield size={20} />} />
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                        <p className="text-slate-400 text-sm leading-relaxed">
                            <strong className="text-white">Anomalous Velocity Detection (AVD)</strong> protects market integrity by
                            dampening suspicious voting patterns in real-time.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AVDRule trigger="> 20 votes/hour on single item" action="50% dampening" />
                            <AVDRule trigger="Account age < 7 days" action="30% dampening" />
                            <AVDRule trigger="No social provider linked" action="50% dampening" />
                            <AVDRule trigger="> 50 votes/day per user" action="90% dampening" />
                            <AVDRule trigger="> 5 votes from same IP in 10 min" action="60% dampening" />
                            <AVDRule trigger="Confidence score < 0.2" action="Shadow ban (0% effect)" />
                        </div>
                    </div>
                </div>

                {/* Settlement Oracle */}
                <div className="space-y-6">
                    <SectionHeader title="Settlement Oracle" icon={<Scale size={20} />} />
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Stakes are settled automatically by comparing predicted ranks against actual ranks at the deadline.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <PayoutCard outcome="Exact Match" multiplier="5.0x" example="Predicted #3 → Actual #3" color="text-emerald-400" />
                            <PayoutCard outcome="Off by 1" multiplier="1.5x" example="Predicted #3 → Actual #2 or #4" color="text-amber-400" />
                            <PayoutCard outcome="Miss" multiplier="0x" example="Predicted #3 → Actual #8" color="text-rose-400" />
                        </div>
                    </div>
                </div>

                {/* Risk Disclosures */}
                <div className="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/20 space-y-6">
                    <h2 className="text-xl font-black text-rose-500 uppercase tracking-tight flex items-center gap-3">
                        <AlertTriangle /> Risk Disclosures
                    </h2>
                    <div className="space-y-4 text-sm text-rose-200/80">
                        <RiskItem title="Capital Loss">
                            Stakes are non-refundable. You may lose your entire stake if predictions are incorrect.
                        </RiskItem>
                        <RiskItem title="Market Manipulation">
                            Despite AVD protections, coordinated attacks by malicious actors may temporarily affect rankings.
                        </RiskItem>
                        <RiskItem title="System Availability">
                            Settlement depends on Cloud Functions reliability. Downtime may delay payouts.
                        </RiskItem>
                        <RiskItem title="Regulatory">
                            This platform may be subject to prediction market or gambling regulations in your jurisdiction.
                        </RiskItem>
                    </div>
                    <p className="text-[10px] text-rose-400/60 uppercase tracking-widest font-black">
                        By using Star Ranker, you acknowledge these risks and agree to our Terms of Service.
                    </p>
                </div>

                {/* Data Integrity */}
                <div className="space-y-6">
                    <SectionHeader title="Snapshot Integrity" icon={<Eye size={20} />} />
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Every 30 minutes, the system creates an immutable snapshot of all rankings. Snapshots are timestamped
                        and used for settlement verification. Historical snapshots are retained for audit purposes.
                    </p>
                </div>
            </div>
        </div>
    );
}

// Legacy component for backward compatibility
export function StaticInfoPage({ title, icon: Icon }) {
    // Redirect based on title
    if (title === "How It Works") {
        return <HowItWorksPage />;
    }
    return <TransparencyPage />;
}

// ============================================
// Helper Components
// ============================================

function StepCard({ number, icon, title, description }) {
    return (
        <div className="flex gap-6 items-start group">
            <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent group-hover:text-slate-950 transition-all">
                {icon}
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-brand-accent font-black">STEP {number}</span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">{title}</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function TierCard({ tier, influence, requirement, color }) {
    return (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className={cn("text-sm font-black uppercase", color)}>{tier}</h4>
            <p className="text-xl font-mono font-black text-white">{influence}</p>
            <p className="text-[10px] text-slate-600 uppercase">{requirement}</p>
        </div>
    );
}

function FAQItem({ question, answer }) {
    return (
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <h4 className="text-sm font-black text-white mb-2">{question}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{answer}</p>
        </div>
    );
}

function SectionHeader({ title, icon }) {
    return (
        <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="text-brand-accent">{icon}</span> {title}
        </h3>
    );
}

function AVDRule({ trigger, action }) {
    return (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase mb-1">Trigger</p>
            <p className="text-xs text-slate-300 font-medium mb-2">{trigger}</p>
            <p className="text-[10px] text-amber-500 font-black uppercase">{action}</p>
        </div>
    );
}

function PayoutCard({ outcome, multiplier, example, color }) {
    return (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 uppercase mb-1">{outcome}</p>
            <p className={cn("text-2xl font-mono font-black", color)}>{multiplier}</p>
            <p className="text-[10px] text-slate-600 mt-2">{example}</p>
        </div>
    );
}

function RiskItem({ title, children }) {
    return (
        <div>
            <h4 className="text-sm font-black text-rose-300 uppercase mb-1">{title}</h4>
            <p className="text-rose-200/70">{children}</p>
        </div>
    );
}
