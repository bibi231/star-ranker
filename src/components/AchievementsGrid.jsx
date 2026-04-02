import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Medal, Flame, Trophy, Target, Shield, Zap, Sparkles, Lock, Info } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';

const ICONS = {
    streak: Flame,
    win_streak: Target,
    oracle_rank: Trophy,
    volume: Zap,
    reputation: Medal,
    default: Medal
};

const TIER_COLORS = {
    bronze: 'from-amber-700/80 to-amber-900/90 border-amber-800 text-amber-500 shadow-amber-900/40',
    silver: 'from-slate-300/80 to-slate-500/90 border-slate-400 text-slate-100 shadow-slate-500/40',
    gold: 'from-yellow-400/80 to-amber-600/90 border-amber-500 text-white shadow-amber-500/40',
    diamond: 'from-cyan-300/80 to-blue-500/90 border-cyan-400 text-cyan-50 shadow-cyan-500/60'
};

const POTENTIAL_ACHIEVEMENTS = [
    { type: 'reputation', title: 'Oracle Initiate', description: 'Reach 1,000 Reputation Points', requirement: 1000 },
    { type: 'volume', title: 'Magnitude Specialist', description: 'Deploy over $1,000 in a single epoch', requirement: 1000 },
    { type: 'streak', title: 'Persistence Protocol', description: 'Maintain a 7-day login streak', requirement: 7 },
    { type: 'win_streak', title: 'Precision Oracle', description: 'Correctly predict 5 consecutive outcomes', requirement: 5 },
    { type: 'referral', title: 'Viral Vector', description: 'Onboard 3 new Oracles via your link', requirement: 3 },
    { type: 'rank', title: 'Top Tier Asset', description: 'Reach a Top 10 ranking in any category', requirement: 10 },
    { type: 'system', title: 'Early Adopter', description: 'Active during the Genesis Epoch', requirement: 1 },
    { type: 'volume', title: 'Market Maker', description: 'Total trading volume exceeds $10,000', requirement: 10000 }
];

export function AchievementsGrid() {
    const { token, reputation } = useStore();
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoveredId, setHoveredId] = useState(null);

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
                    if (isMounted) setAchievements(data.achievements || []);
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
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader icon={<Zap className="w-10 h-10 text-brand-accent animate-pulse" />} />
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Decrypting Ledger...</p>
            </div>
        );
    }

    const unlockedTypes = achievements.map(a => a.type);
    const lockedAchievements = POTENTIAL_ACHIEVEMENTS.filter(p => !unlockedTypes.includes(p.type));

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 p-1">
            {/* Unlocked Achievements */}
            {achievements.map((achievement, idx) => (
                <AchievementCard 
                    key={achievement.id}
                    achievement={achievement}
                    idx={idx}
                    isLocked={false}
                    onHover={setHoveredId}
                    isHovered={hoveredId === achievement.id}
                />
            ))}

            {/* Locked Achievements */}
            {lockedAchievements.map((p, idx) => (
                <AchievementCard 
                    key={`locked-${p.type}`}
                    achievement={{
                        id: `locked-${p.type}`,
                        type: p.type,
                        tier: 'bronze',
                        metadata: { title: p.title, description: p.description }
                    }}
                    idx={achievements.length + idx}
                    isLocked={true}
                    onHover={setHoveredId}
                    isHovered={hoveredId === `locked-${p.type}`}
                />
            ))}
        </div>
    );
}

function AchievementCard({ achievement, idx, isLocked, onHover, isHovered }) {
    const Icon = ICONS[achievement.type] || ICONS.default;
    const tierColor = TIER_COLORS[achievement.tier] || TIER_COLORS.bronze;
    const colors = tierColor.split(' ');
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onMouseEnter={() => onHover(achievement.id)}
            onMouseLeave={() => onHover(null)}
            className={cn(
                "relative flex flex-col items-center p-6 rounded-[2rem] border transition-all duration-300 group cursor-help overflow-hidden",
                isLocked 
                  ? "bg-slate-900/20 border-white/5 grayscale" 
                  : "bg-slate-900/40 border-white/10 hover:border-white/20 shadow-2xl"
            )}
        >
            {/* Holographic Overlays */}
            {!isLocked && (
                <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-tr",
                    colors.slice(0, 2).join(' ')
                )} />
            )}
            
            {/* Achievement Icon */}
            <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative z-10 transition-transform duration-500 group-hover:scale-110",
                isLocked ? "bg-slate-800/50 text-slate-700" : "bg-slate-800/80 shadow-xl"
            )}>
                {!isLocked && (
                    <div className={cn(
                        "absolute inset-0 blur-xl opacity-20",
                        colors.slice(-1)
                    )} />
                )}
                
                {isLocked ? (
                    <Lock size={24} className="opacity-20" />
                ) : (
                    <Icon size={28} className={cn("relative z-10", colors[3])} />
                )}

                {achievement.tier === 'diamond' && !isLocked && (
                    <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-cyan-400 animate-pulse" />
                )}
            </div>

            <div className="relative z-10 text-center space-y-1">
                <h4 className={cn(
                    "text-[11px] font-black uppercase tracking-[0.15em]",
                    isLocked ? "text-slate-600" : "text-white"
                )}>
                    {achievement.metadata?.title}
                </h4>
                <p className={cn(
                   "text-[8px] font-black uppercase tracking-[0.2em] italic", 
                   isLocked ? "text-slate-800" : colors[3]
                )}>
                    {isLocked ? 'Unauthorized' : achievement.tier}
                </p>
            </div>

            {/* Tooltip Overlay */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center space-y-2 pointer-events-none"
                    >
                        <Info size={14} className="text-brand-accent/50 mb-1" />
                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-relaxed">
                            {achievement.metadata?.description}
                        </p>
                        {isLocked && (
                            <div className="mt-2 py-1 px-3 rounded-full bg-slate-800 border border-white/5">
                                <span className="text-[8px] font-black text-brand-accent uppercase tracking-widest italic">Encrypted Protocol</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scanline Effect */}
            <div className="absolute inset-0 scanlines opacity-5 pointer-events-none" />
        </motion.div>
    );
}

function Loader({ icon }) {
    return (
        <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-brand-accent/20 animate-pulse" />
            {icon}
        </div>
    );
}
