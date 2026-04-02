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
    Twitter,
    Bookmark,
    Trophy,
    ArrowUpRight,
    Copy,
    Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ReferralPanel } from '../components/ReferralPanel';
import { useWatchlist } from '../hooks/useWatchlist';
import { AchievementsGrid } from '../components/AchievementsGrid';
import { PortfolioWidget } from '../components/PortfolioWidget';
import { ActivityLogModal } from '../components/ActivityLogModal';
import { DailyQuests } from '../components/DailyQuests';
import { SystemStatus } from '../components/SystemStatus';

export function UserDashboard() {
    const { user, balance, playBalance, stakes, reputation, reputationHistory, fetchReputationHistory, tier, setDepositOpen, setWithdrawalOpen, formatValue, bindWallet, fetchStakes, fetchUserProfile } = useStore();
    const [isExiting, setIsExiting] = useState(null);
    const [isActivityLogOpen, setActivityLogOpen] = useState(false);
    const [isReferralCopied, setReferralCopied] = useState(false);
    const isMobile = useIsMobile();
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    useEffect(() => {
        if (isConnected && address && user && user.walletAddress !== address) {
            bindWallet(address);
        }
    }, [isConnected, address, user, bindWallet]);

    useEffect(() => {
        if (user) {
            fetchReputationHistory();
        }
    }, [user, fetchReputationHistory]);

    const shareToX = (stake) => {
        const url = `${window.location.origin}/signup?ref=${user?.referralCode || ''}`;
        const message = `Just deployed ${formatValue(stake.amount)} units on ${stake.itemName} to rank #${stake.targetRank} — @StarRanker Oracle Beta 🚀\n\nJoin the network: ${url}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
    };

    const copyReferral = () => {
        const url = `${window.location.origin}/signup?ref=${user?.referralCode || ''}`;
        navigator.clipboard.writeText(url);
        setReferralCopied(true);
        setTimeout(() => setReferralCopied(false), 2000);
    };

    const handleExit = async (stakeId) => {
        if (!window.confirm("Are you sure you want to cash out early? This action is irreversible.")) return;
        setIsExiting(stakeId);
        try {
            const { apiPost } = await import('../lib/api');
            const res = await apiPost(`/api/stakes/${stakeId}/exit`);
            if (res.success) {
                // toast.success(`Position liquidated for ${formatValue(res.payout)}`);
                await fetchStakes();
                await fetchUserProfile();
            }
        } catch (err) {
            console.error("Exit failed");
        } finally {
            setIsExiting(null);
        }
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
        <div className="p-4 md:p-8 space-y-8 md:space-y-12 bg-slate-950 min-h-screen relative overflow-hidden noise-bg">
            {/* Background Glows */}
            <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 -right-1/4 w-1/2 h-full bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header / Stats Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 mb-4 relative z-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-0.5 w-8 bg-brand-accent rounded-full" />
                        <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.4em] italic">System Core</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Command Center</h1>
                    <p className="text-[10px] md:text-xs text-slate-500 font-black uppercase tracking-[0.25em] flex items-center gap-2 opacity-80 pt-2">
                        <Clock size={10} className="text-brand-accent" />
                        Network Active: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 md:gap-6 w-full lg:w-auto">
                    <StatCard label="Network Credits" value={formatValue(balance)} icon={<Wallet size={16} />} color="text-emerald-400" glow="emerald" onActionClick={() => setDepositOpen(true)} />
                    <StatCard label="Oracle Rating" value={reputation.toLocaleString()} icon={<Star size={16} />} color="text-amber-500" glow="amber" />
                    <StatCard label="Identity Tier" value={tier} icon={<ShieldCheck size={16} />} color="text-brand-accent" glow="cyan" />
                </div>
            </div>

            {(!user || user?.balance === 0) && (
                <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/0 via-brand-accent/5 to-brand-accent/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
                            <Zap size={32} className="text-brand-accent" />
                        </div>
                        <div>
                            <p className="text-white font-black text-xl italic uppercase tracking-tight">Initialization Required</p>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Fund your wallet to synchronize with the market network and establish reputation.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDepositOpen(true)}
                        className="premium-btn-cyan px-10 py-4 rounded-2xl flex-shrink-0 transition-all font-black text-[10px] tracking-[0.3em] uppercase group"
                    >
                        Synchronize Wallet
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-12 relative z-10">
                {/* Left Col: Active Stakes & Portfolio */}
                <div className="xl:col-span-2 space-y-8 md:space-y-16">
                    {/* Portfolio Summary */}
                    <PortfolioWidget />

                    {/* Active Stakes */}
                    <SectionBox title="Active Operations" icon={<Briefcase size={16} />}>
                        {stakes.length > 0 ? (
                            <div className="premium-ledger">
                                <div className="hidden md:flex border-b border-white/5 bg-white/[0.02] px-6 py-4">
                                    <span className="w-1/3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Market Entity</span>
                                    <span className="w-1/6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Magnitude</span>
                                    <span className="w-1/6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Coordinate</span>
                                    <span className="w-1/6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Yield Target</span>
                                    <span className="w-1/6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Control</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {(stakes || []).map(stake => (
                                        <div key={stake.id} className="ledger-row group">
                                            <div className="w-full md:w-1/3 flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl bg-slate-900 border flex items-center justify-center transition-all shadow-xl group-hover:scale-105",
                                                    stake.isPlayMode ? "border-amber-500/20 text-amber-500" : "border-emerald-500/20 text-emerald-500"
                                                )}>
                                                    {stake.isPlayMode ? <Trophy size={20} /> : <Zap size={20} fill="currentColor" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white uppercase tracking-tight italic">{stake.itemName}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Signal</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="hidden md:flex flex-col items-end w-1/6">
                                                <span className="text-[11px] font-mono font-black text-white italic">
                                                    {stake.isPlayMode ? `S ${stake.amount.toLocaleString()}` : formatValue(stake.amount)}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Entry magnitude</span>
                                            </div>

                                            <div className="hidden md:flex flex-col items-end w-1/6">
                                                <span className="text-[11px] font-mono font-black text-brand-accent tracking-widest">#{stake.targetRank}</span>
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Target rank</span>
                                            </div>

                                            <div className="hidden md:flex flex-col items-end w-1/6">
                                                <span className="text-[11px] font-mono font-black text-emerald-400">
                                                    +{stake.isPlayMode ? `${Math.floor((stake.amount * stake.odds) - stake.amount).toLocaleString()}` : formatValue((stake.amount * stake.odds) - stake.amount)}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Potential win</span>
                                            </div>

                                            <div className="w-full md:w-1/6 flex items-center justify-end gap-3">
                                                {!stake.isPlayMode && stake.status === 'active' && (
                                                    <button
                                                        onClick={() => handleExit(stake.id)}
                                                        disabled={isExiting === stake.id}
                                                        className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/10 text-[9px] font-black uppercase transition-all tracking-widest"
                                                    >
                                                        {isExiting === stake.id ? '...' : 'Exit'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => shareToX(stake)}
                                                    className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-brand-accent hover:border-brand-accent/20 transition-all border border-white/5"
                                                >
                                                    <Twitter size={14} fill="currentColor" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-32 text-center bg-slate-900/40 border-2 border-dashed border-white/5 rounded-3xl group hover:border-brand-accent/20 transition-all">
                                <Zap size={48} className="mx-auto text-slate-800 mb-6 group-hover:text-brand-accent/20 transition-all" />
                                <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] italic">No active neural connections established.</p>
                                <button
                                    onClick={() => window.location.href = '/markets'}
                                    className="mt-6 text-[10px] font-black text-brand-accent uppercase tracking-widest hover:text-white transition-all underline underline-offset-8 decoration-brand-accent/30"
                                >
                                    Access Global Markets
                                </button>
                            </div>
                        )}
                    </SectionBox>

                    {/* Reputation Velocity Chart */}
                    <div className="command-panel min-h-[300px]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <TrendingUp size={20} className="text-brand-accent" />
                                <h2 className="text-sm font-black text-white uppercase tracking-widest italic">Neural Reputation Velocity</h2>
                            </div>
                            <div className="flex gap-1">
                                {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-accent/20" />)}
                            </div>
                        </div>
                        
                        <div className="h-64 flex items-end gap-2 px-1 relative">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                                {[1,2,3,4].map(i => <div key={i} className="h-px w-full bg-white" />)}
                            </div>
                            
                            {reputationHistory && reputationHistory.length > 0 ? (reputationHistory || []).map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(item.value / Math.max(140, ...(reputationHistory || []).map(r => r.value))) * 100}%` }}
                                    transition={{ delay: i * 0.03, type: 'spring', damping: 15 }}
                                    className="flex-1 bg-gradient-to-t from-brand-accent/5 via-brand-accent/40 to-brand-accent rounded-t-lg group relative cursor-crosshair min-w-[8px]"
                                >
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 border border-brand-accent/30 px-3 py-2 rounded-xl text-[11px] font-mono font-black text-brand-accent transition-all pointer-events-none z-10 whitespace-nowrap shadow-2xl scale-50 group-hover:scale-100 origin-bottom">
                                        <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">{item.day}</div>
                                        {item.value} REP
                                    </div>
                                    <div className="absolute inset-0 bg-brand-accent blur-[20px] opacity-0 group-hover:opacity-20 transition-opacity" />
                                </motion.div>
                            )) : (
                                <div className="w-full flex items-center justify-center h-full">
                                    <Loader2 size={32} className="text-brand-accent animate-spin opacity-20" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Oracle Badges */}
                    <SectionBox title="Achievement Credentials" icon={<Trophy size={16} />}>
                        <AchievementsGrid />
                    </SectionBox>
                </div>

                {/* Right Col: Identity & History */}
                <div className="space-y-8 md:space-y-12">
                     <SystemStatus />
                     <DailyQuests />

                    {/* Oracle Watchlist */}
                    <SectionBox title="Intelligence Monitor" icon={<Bookmark size={16} />}>
                        <WatchlistWidget />
                    </SectionBox>

                    <SectionBox title="Synchronized Feed" icon={<History size={16} />}>
                        <div className="space-y-8 relative">
                            <div className="absolute left-[3px] top-4 bottom-4 w-px bg-white/5" />
                            {user?.recentActivity?.length > 0 ? (
                                (user?.recentActivity || []).map((act, i) => (
                                    <div key={act.id || i} className="flex gap-6 items-start group relative">
                                        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-brand-accent transition-all shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.5)] z-10" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-300 leading-tight uppercase tracking-tight group-hover:text-white transition-colors italic">
                                                {act.description}
                                            </p>
                                            <p className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                                {getRelativeTime(act.createdAt)} <span className="opacity-30">|</span> <span className="text-brand-accent/60">{act.type.toUpperCase()}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center opacity-40">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">History vault empty.</p>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => setActivityLogOpen(true)}
                            className="w-full mt-10 py-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-[10px] font-black uppercase text-brand-accent hover:text-white hover:border-brand-accent/20 transition-all flex items-center justify-center gap-3 tracking-[0.3em] font-mono italic"
                        >
                            DECRYPT FULL LOGS <ChevronRight size={14} />
                        </button>
                    </SectionBox>

                    <div className="command-panel p-8 space-y-6 group">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-brand-accent/5 border border-brand-accent/20 flex items-center justify-center text-brand-accent shadow-[0_0_30px_rgba(56,189,248,0.1)] group-hover:scale-110 transition-all">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider italic">AVD Verification</h3>
                                <p className="text-[11px] text-emerald-400 font-mono font-black italic tracking-widest uppercase">SCORE: 98.4% ALPHA</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-black uppercase tracking-widest italic opacity-60">
                            "Protocol established. Anomalous velocity detection synchronized. Terminal clearance level: V."
                        </p>
                    </div>

                    <SectionBox title="Identity Protocol" icon={<Wallet size={16} />}>
                        {isConnected ? (
                            <div className="space-y-4">
                                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-4">
                                    <div className="text-[10px] text-emerald-400 font-black uppercase flex items-center gap-3 tracking-[0.3em] italic">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10B981]" /> Bound
                                    </div>
                                    <div className="font-mono text-[11px] text-slate-400 break-all leading-relaxed px-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                        {address}
                                    </div>
                                </div>
                                <button
                                    onClick={() => disconnect()}
                                    className="w-full py-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/30 text-rose-400 font-black text-[10px] uppercase tracking-[0.3em] transition-all italic"
                                >
                                    Terminate Connection
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-16 border border-dashed border-white/5 rounded-3xl group hover:border-brand-accent/20 transition-all">
                                <Wallet size={40} className="mx-auto text-slate-800 mb-6 group-hover:text-brand-accent/20 transition-all" />
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.25em] px-8 leading-relaxed italic opacity-80">
                                    Awaiting cryptographical signature. Initialize via Terminal console.
                                </p>
                            </div>
                        )}
                    </SectionBox>
                </div>
            </div>

            <ActivityLogModal isOpen={isActivityLogOpen} onClose={() => setActivityLogOpen(false)} />
        </div>
    );
}

function StatCard({ label, value, icon, color, glow, onActionClick }) {
    const glowClass = glow === 'emerald' ? 'bg-emerald-500/5' : glow === 'amber' ? 'bg-amber-500/5' : 'bg-brand-accent/5';
    
    return (
        <div className={cn("px-10 py-6 rounded-3xl glass-panel shadow-2xl min-w-[220px] group transition-all relative overflow-hidden flex flex-col justify-end min-h-[140px]", glowClass)}>
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all group-hover:scale-110">
                {icon}
            </div>
            
            <div className="relative z-10 space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block opacity-60">{label}</span>
                <div className={cn("text-3xl md:text-4xl font-mono font-black italic tracking-tighter leading-none", color)}>
                    {value}
                </div>
            </div>

            {onActionClick && (
                <button 
                  onClick={onActionClick}
                  className="absolute top-4 left-4 p-2 rounded-xl bg-white/5 text-slate-600 hover:text-white hover:bg-white/10 transition-all"
                >
                    <ArrowUpRight size={14} />
                </button>
            )}
        </div>
    );
}

function SectionBox({ title, icon, children }) {
    return (
        <div className="p-8 md:p-12 rounded-3xl glass-panel shadow-2xl space-y-10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none group-hover:scale-125 transition-transform duration-700">
                {icon}
            </div>
            <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 rounded-2xl bg-brand-accent/5 border border-brand-accent/20">
                    <span className="text-brand-accent">{icon}</span>
                </div>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] italic">
                    {title}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
            </div>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

function WatchlistWidget() {
    const { watchlist, loading } = useWatchlist();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="text-brand-accent animate-spin opacity-20" />
            </div>
        );
    }

    if (watchlist.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-slate-800/50 border-dashed rounded-3xl bg-slate-900/40 group hover:border-brand-accent/20 transition-all">
                <Bookmark size={48} className="text-slate-800 mb-6 group-hover:text-brand-accent/20 transition-all" />
                <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] text-center italic">Monitor Disconnected</p>
                <button 
                    onClick={() => window.location.href = '/markets'}
                    className="mt-6 text-[10px] font-black text-brand-accent uppercase tracking-widest hover:text-white transition-all underline underline-offset-8 decoration-brand-accent/30"
                >
                    Add Market Tracks
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar pr-3">
            {watchlist.map(track => {
                const item = track.item;
                if (!item) return null;
                return (
                    <motion.div 
                        key={track.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-brand-accent/30 hover:bg-slate-900 transition-all cursor-pointer group shadow-xl"
                        onClick={() => window.location.href = `/market/${item.docId}`}
                    >
                        <div className="flex items-center gap-5">
                            <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-950 border border-white/5 group-hover:border-brand-accent/20 transition-all">
                                <span className="font-mono text-xs font-black italic text-brand-accent">#{item.rank || '-'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-white uppercase tracking-tight italic">{item.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-mono font-black text-slate-500 italic">{item.score ? Math.floor(item.score).toLocaleString() : '---'} SIG</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 text-brand-accent/40 group-hover:text-brand-accent transition-all">
                            <ArrowUpRight size={16} />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
