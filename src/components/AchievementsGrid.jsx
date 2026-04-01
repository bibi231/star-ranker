import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Medal, Flame, Trophy, Target, Shield, Zap, Sparkles } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';

const ICONS = {
    streak: Flame,
    win_streak: Target,
    oracle_rank: Trophy,
    volume: Zap,
    default: Medal
};

const TIER_COLORS = {
    bronze: 'from-amber-700 to-amber-900 border-amber-800 text-amber-500 shadow-amber-900/20',
    silver: 'from-slate-300 to-slate-500 border-slate-400 text-slate-100 shadow-slate-500/20',
    gold: 'from-yellow-400 to-amber-600 border-amber-500 text-white shadow-amber-500/20',
    diamond: 'from-cyan-300 to-blue-500 border-cyan-400 text-cyan-50 shadow-cyan-500/40'
};

const TIER_BG = {
    bronze: 'bg-amber-900/10',
    silver: 'bg-slate-400/10',
    gold: 'bg-amber-500/10',
    diamond: 'bg-cyan-500/10'
};

export function AchievementsGrid() {
    const { token } = useStore();
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        async function fetchAchievements() {
            if (!token) return;
            try {
                const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const res = await fetch(`${BASE_URL}/api/user/achievements`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setAchievements(data.achievements || []);
                    }
                }
            } catch (err) {
                console.error("Failed to load achievements", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        
        fetchAchievements();
        return () => { isMounted = false; };
    }, [token]);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Zap className="w-8 h-8 animate-pulse text-amber-500" />
            </div>
        );
    }

    if (achievements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 border border-slate-800 border-dashed rounded-2xl bg-slate-900/50">
                <Shield size={32} className="text-slate-700 mb-3" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest text-center">No Achievements Unlocked</p>
                <p className="text-[10px] text-slate-600 mt-1 max-w-[200px] text-center">Place stakes, build streaks, and rank up to earn badges.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {achievements.map((achievement, idx) => {
                const Icon = ICONS[achievement.type] || ICONS.default;
                const tierColor = TIER_COLORS[achievement.tier] || TIER_COLORS.bronze;
                const bgClass = TIER_BG[achievement.tier] || TIER_BG.bronze;
                
                return (
                    <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                            "relative overflow-hidden rounded-2xl border flex flex-col items-center p-4 text-center group",
                            bgClass,
                            tierColor.split(' ')[2] // Just the border class from tierColor string
                        )}
                        style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}
                    >
                        {/* Glow effect */}
                        <div className={cn(
                            "absolute inset-0 opacity-20 bg-gradient-to-br transition-opacity duration-300 group-hover:opacity-40",
                            tierColor.split(' ').slice(0, 2).join(' ')
                        )} />
                        
                        {/* Icon Container */}
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center mb-3 relative z-10 shadow-lg bg-gradient-to-br",
                            tierColor.split(' ').slice(0, 2).join(' ')
                        )}>
                            <Icon size={24} className={tierColor.split(' ')[3]} />
                            {achievement.tier === 'diamond' && (
                                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-white animate-pulse" />
                            )}
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <span className="font-black text-xs uppercase tracking-wider text-slate-200 mb-1 leading-tight">
                                {achievement.metadata?.title || 'Achievement'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                                {achievement.tier}
                            </span>
                            
                            {/* Detailed Description */}
                            <span className="text-[10px] text-slate-500 leading-tight">
                                {achievement.metadata?.description || `Unlocked level ${achievement.level}`}
                            </span>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
