import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useDisconnect } from 'wagmi';
import { useStore } from '../store/storeModel';
import { useIsMobile } from '../hooks/useIsMobile';
import {
    LayoutDashboard,
    TrendingUp,
    History,
    Star,
    Wallet,
    Zap,
    ShieldCheck,
    Clock,
    ChevronRight,
    Briefcase,
    Mail,
    AlertTriangle,
    Loader2,
    RefreshCw,
    Share2,
    Twitter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ReferralPanel } from '../components/ReferralPanel';

export function UserDashboard() {
    const { user, balance, reputation, stakes, reputationHistory, tier, emailVerified, sendVerificationEmail, refreshUser, bindWallet, formatValue } = useStore();
    const [isResending, setIsResending] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isMobile = useIsMobile();
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    useEffect(() => {
        if (isConnected && address && user && user.walletAddress !== address) {
            bindWallet(address);
        }
    }, [isConnected, address, user, bindWallet]);

    const shareToX = (stake) => {
        const url = `${window.location.origin}/signup?ref=${user?.referralCode || ''}`;
        const message = `Just deployed ${formatValue(stake.amount)} units on ${stake.itemName} to rank #${stake.targetRank} — @StarRanker Oracle Beta 🚀\n\nJoin the network: ${url}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
    };

    const getRelativeTime = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="p-4 md:p-8 space-y-8 md:space-y-12 bg-[#020617] min-h-screen">

            {/* Header / Stats Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-4">
                <div className="space-y-3">
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">Oracle Portfolio</h1>
                    <p className="text-[10px] md:text-xs text-slate-500 font-black uppercase tracking-[0.25em] leading-none opacity-80">
                        Session established: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 md:gap-6 w-full lg:w-auto">
                    <StatCard label="Available Capital" value={formatValue(balance)} icon={<Wallet size={16} />} color="text-emerald-400" />
                    <StatCard label="Oracle Reputation" value={reputation.toLocaleString()} icon={<Star size={16} />} color="text-[#C9A84C]" />
                    <StatCard label="Identity Tier" value={tier} icon={<ShieldCheck size={16} />} color="text-brand-accent" />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-10">
                {/* Left Col: Active Stakes & Portfolio */}
                <div className="xl:col-span-2 space-y-8 md:space-y-12">
                    {/* Active Stakes */}
                    <SectionBox title="Active Deployments" icon={<Briefcase size={16} />}>
                        {stakes.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <th className="py-4">Market Item</th>
                                            <th className="py-4 text-right">Magnitude</th>
                                            <th className="py-4 text-right">Target</th>
                                            <th className="py-4 text-right">Est. Yield</th>
                                            <th className="py-4 text-right">Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {stakes.map(stake => (
                                            <tr key={stake.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="py-5 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-slate-600 group-hover:border-brand-accent/30 transition-all">
                                                        <Zap size={16} fill="currentColor" className="text-emerald-500" />
                                                    </div>
                                                    <span className="text-xs font-black text-white uppercase tracking-tight">{stake.itemName}</span>
                                                </td>
                                                <td className="py-5 text-right font-mono text-xs font-black text-slate-300">{formatValue(stake.amount)}</td>
                                                <td className="py-5 text-right font-mono text-xs font-black text-brand-accent">#{stake.targetRank}</td>
                                                <td className="py-5 text-right font-mono text-xs font-black text-emerald-400">+{formatValue((stake.amount * stake.odds) - stake.amount)}</td>
                                                <td className="py-5 text-right">
                                                    <button
                                                        onClick={() => shareToX(stake)}
                                                        className="p-2 ml-auto rounded-lg bg-white/5 text-slate-500 hover:text-brand-accent hover:bg-brand-accent/10 transition-all flex items-center justify-center border border-white/5"
                                                    >
                                                        <Twitter size={12} fill="currentColor" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                                <Zap size={40} className="mx-auto text-slate-800 mb-6 opacity-20" />
                                <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.3em]">No active market participation detected.</p>
                            </div>
                        )}
                    </SectionBox>

                    {/* Reputation Velocity Chart */}
                    <SectionBox title="Reputation Velocity" icon={<TrendingUp size={16} />}>
                        <div className="h-56 flex items-end gap-1.5 px-2">
                            {[40, 60, 45, 70, 85, 90, 80, 75, 95, 100, 85, 110, 120, 105, 90, 115, 130].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(h / 140) * 100}%` }}
                                    transition={{ delay: i * 0.03 }}
                                    className="flex-1 bg-gradient-to-t from-[#1E3A5F]/10 via-[#38bdf8]/40 to-[#38bdf8] rounded-t-sm"
                                />
                            ))}
                        </div>
                    </SectionBox>
                </div>

                {/* Right Col: Identity & History */}
                <div className="space-y-8 md:space-y-12">
                    <SectionBox title="Influence Archive" icon={<History size={16} />}>
                        <div className="space-y-8">
                            {user?.recentActivity?.length > 0 ? (
                                user.recentActivity.map((act, i) => (
                                    <div key={act.id || i} className="flex gap-4 items-start group">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-brand-accent transition-all shrink-0 shadow-[0_0_8px_rgba(56,189,248,0.3)]" />
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-bold text-slate-300 leading-tight uppercase tracking-tight">
                                                {act.description}
                                            </p>
                                            <p className="text-[9px] font-mono text-slate-600 font-black uppercase tracking-widest">
                                                {getRelativeTime(act.createdAt)} • {act.type.toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center">
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">No archival data available.</p>
                                </div>
                            )}
                        </div>
                        <button className="w-full mt-8 py-4 rounded-2xl border border-white/5 text-[10px] font-black uppercase text-slate-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-3 tracking-widest">
                            View Full Logs <ChevronRight size={14} />
                        </button>
                    </SectionBox>

                    <div className="p-8 rounded-[2.5rem] bg-[#0D1B2A] border border-[#1E3A5F]/30 shadow-2xl space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shadow-[0_0_20px_rgba(56,189,248,0.1)]">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-wider">AVD Verification</h3>
                                <p className="text-[11px] text-emerald-400 font-mono font-black italic">TRUST SCORE: 98.4%</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-wide italic opacity-70">
                            "Account synchronized with Anomalous Velocity Detection engine. Oracle clearance active."
                        </p>
                    </div>

                    <SectionBox title="Linked Web3 Identity" icon={<Wallet size={16} />}>
                        {isConnected ? (
                            <div className="space-y-4">
                                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-3">
                                    <div className="text-[10px] text-emerald-400 font-[900] uppercase flex items-center gap-2 tracking-[0.2em]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Linked
                                    </div>
                                    <div className="font-mono text-[11px] text-slate-400 break-all leading-relaxed px-1">
                                        {address}
                                    </div>
                                </div>
                                <button
                                    onClick={() => disconnect()}
                                    className="w-full py-4 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                                >
                                    Terminate Link
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-10 border border-dashed border-white/5 rounded-3xl">
                                <Wallet size={32} className="mx-auto text-slate-800 mb-4 opacity-50" />
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-6 leading-relaxed">
                                    Establishing Web3 protocol bridge... Use the Terminal console to bind identity.
                                </p>
                            </div>
                        )}
                    </SectionBox>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="px-8 py-5 rounded-[2rem] bg-[#0D1B2A] border border-[#1E3A5F]/30 shadow-2xl min-w-[200px] group hover:border-[#38bdf8]/30 transition-all">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-slate-500 group-hover:text-brand-accent transition-colors">{icon}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
            </div>
            <div className={cn("text-2xl md:text-3xl font-mono font-black italic tracking-tighter", color)}>{value}</div>
        </div>
    );
}

function SectionBox({ title, icon, children }) {
    return (
        <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0D1B2A] border border-[#1E3A5F]/20 shadow-2xl space-y-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                {icon}
            </div>
            <h2 className="text-xs font-[900] text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4 opacity-80">
                <span className="text-brand-accent">{icon}</span> {title}
            </h2>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
