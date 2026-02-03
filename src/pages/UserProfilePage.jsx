import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
    Award,
    Zap,
    Star,
    TrendingUp,
    History,
    ExternalLink,
    ShieldCheck,
    Share2
} from 'lucide-react';
import { cn } from '../lib/utils';

export function UserProfilePage() {
    const { username } = useParams();
    const { user: currentUser } = useStore();

    // Mock data for public profile
    const profile = {
        username: username || "Oracle_Alpha",
        tier: "Elder Oracle",
        reputation: 15400,
        accuracy: "94.2%",
        joinedDate: "Feb 2024",
        bio: "Analyzing market sentiment across the crypto and tech sectors since the genesis block.",
        badges: ["Early Adopter", "Top Predictor", "AVD Verified"],
        recentActivity: [
            { item: "Bitcoin", action: "voted up", time: "2h ago" },
            { item: "Apple Vision Pro", action: "voted down", time: "5h ago" },
            { item: "Solana", action: "staked $500", time: "1d ago" },
        ]
    };

    return (
        <div className="min-h-screen bg-brand-bg p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Profile Header */}
                <div className="relative p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl group-hover:bg-brand-accent/10 transition-all" />

                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-24 h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 relative">
                            <Zap size={48} className="text-brand-accent/30" />
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-brand-accent border-4 border-slate-900 flex items-center justify-center text-slate-950">
                                <ShieldCheck size={14} />
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                                <div>
                                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{profile.username}</h1>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        {profile.tier} <span className="w-1 h-1 rounded-full bg-slate-700" /> Member since {profile.joinedDate}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-4 py-2 rounded-xl bg-slate-800 text-[10px] font-black uppercase text-slate-300 hover:bg-slate-700 transition-all flex items-center gap-2">
                                        <Share2 size={12} /> Share
                                    </button>
                                    <button className="px-4 py-2 rounded-xl bg-brand-accent text-slate-950 text-[10px] font-black uppercase hover:bg-white transition-all">
                                        Add Contact
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 font-medium max-w-2xl">{profile.bio}</p>

                            <div className="flex flex-wrap gap-2">
                                {profile.badges.map(badge => (
                                    <span key={badge} className="px-3 py-1 rounded-lg bg-slate-800/50 border border-slate-700 text-[9px] font-black text-slate-400 uppercase tracking-widest">{badge}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <ProfileStat title="Oracle Reputation" value={profile.reputation.toLocaleString()} icon={<Star className="text-amber-400" />} />
                        <ProfileStat title="Historical Accuracy" value={profile.accuracy} icon={<TrendingUp className="text-emerald-500" />} />
                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Award size={14} className="text-brand-accent" /> Verified Badges
                            </h3>
                            <div className="grid grid-cols-4 gap-2">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className={cn("aspect-square rounded-lg bg-slate-800 flex items-center justify-center", i < 3 ? "text-brand-accent" : "text-slate-700 opacity-30")}>
                                        <Award size={16} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <History size={16} className="text-slate-500" /> Recent Influence Actions
                                </h2>
                                <button className="text-[10px] font-black text-slate-500 uppercase hover:text-brand-accent transition-colors">View All Archive</button>
                            </div>

                            <div className="space-y-6">
                                {profile.recentActivity.map((act, i) => (
                                    <div key={i} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-200">
                                                    {profile.username} <span className="text-slate-500 font-medium">{act.action}</span> <span className="text-white underline decoration-brand-accent/20">{act.item}</span>
                                                </p>
                                                <span className="text-[10px] text-slate-600 font-medium">{act.time}</span>
                                            </div>
                                        </div>
                                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-600 hover:text-brand-accent">
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileStat({ title, value, icon }) {
    return (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</h4>
                    <div className="group-hover:scale-110 transition-transform">{icon}</div>
                </div>
                <div className="text-2xl font-mono font-black text-white">{value}</div>
            </div>
        </div>
    );
}
