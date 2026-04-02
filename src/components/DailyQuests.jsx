import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Trophy, Zap, MessageSquare, Swords, Target, Loader2, Gift } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import toast from 'react-hot-toast';

export function DailyQuests() {
    const [quest, setQuest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);

    const fetchQuests = async () => {
        try {
            const data = await apiGet('/api/quests');
            setQuest(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQuests(); }, []);

    const handleClaim = async () => {
        setClaiming(true);
        try {
            const res = await apiPost('/api/quests/claim');
            toast.success(`Claimed ${res.reward} Reputation!`, {
                icon: '🏆',
                style: { borderRadius: '20px', background: '#0D1B2A', color: '#fff', border: '1px solid #C9A84C' }
            });
            fetchQuests();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setClaiming(false);
        }
    };

    if (loading) return null;

    const quests = [
        { id: 'stake', label: 'DEPLOY CAPITAL', desc: 'Predict a market outcome today', done: quest?.stakedToday, icon: Target },
        { id: 'comment', label: 'SHARE INTELLIGENCE', desc: 'Post 1 comment in a discussion', done: quest?.commentedToday, icon: MessageSquare },
        { id: 'vote', label: 'ARENA DUEL', desc: 'Vote in an Oracle Battle', done: quest?.votedToday, icon: Swords },
    ];

    const allDone = quests.every(q => q.done);

    return (
        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[#0D1B2A] to-[#020617] border border-[#1E3A5F]/30 shadow-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 blur-3xl pointer-events-none group-hover:bg-brand-accent/10 transition-all duration-700" />
            
            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                             <Zap size={14} className="text-brand-accent fill-brand-accent animate-pulse" />
                             <h3 className="text-[10px] font-black text-brand-accent uppercase tracking-[0.3em]">Operational Readiness</h3>
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">DAILY QUESTS</h2>
                    </div>
                    {allDone && !quest?.claimed && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={handleClaim}
                            disabled={claiming}
                            className="bg-amber-500 hover:bg-amber-400 text-[#0D1B2A] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        >
                            {claiming ? <Loader2 size={12} className="animate-spin" /> : <Gift size={14} />} CLAIM REWARD
                        </motion.button>
                    )}
                    {quest?.claimed && (
                         <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-xl border border-emerald-400/20">
                            <CheckCircle2 size={12} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Rewards Claimed</span>
                         </div>
                    )}
                </div>

                <div className="space-y-3">
                    {quests.map((q, i) => (
                        <div key={q.id} className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${q.done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900 border-white/5'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${q.done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                    <q.icon size={18} />
                                </div>
                                <div>
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${q.done ? 'text-emerald-400' : 'text-slate-200'}`}>
                                        {q.label}
                                    </h4>
                                    <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tight">{q.desc}</p>
                                </div>
                            </div>
                            {q.done ? (
                                <CheckCircle2 size={20} className="text-emerald-400 fill-emerald-400/10" />
                            ) : (
                                <Circle size={20} className="text-slate-800" />
                            )}
                        </div>
                    ))}
                </div>

                {!allDone && (
                    <div className="pt-2">
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(quests.filter(q => q.done).length / 3) * 100}%` }}
                                className="h-full bg-brand-accent shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                            />
                        </div>
                        <div className="mt-2 flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-widest">
                            <span>Sector Progress</span>
                            <span>{quests.filter(q => q.done).length} / 3 Complete</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
