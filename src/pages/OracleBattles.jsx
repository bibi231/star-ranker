import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Plus, Timer, Users, Trophy, ChevronRight, TrendingUp, Search, Loader2 } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { useStore } from '../store/storeModel';
import ItemImage from '../components/ItemImage';
import toast from 'react-hot-toast';

export function OracleBattles() {
    const { user, reputation } = useStore();
    const [battles, setBattles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchBattles = async () => {
        try {
            const data = await apiGet('/api/battles');
            setBattles(data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load battle arena");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBattles(); }, []);

    const handleVote = async (battleId, option) => {
        if (!user) return toast.error("Connect identity to vote");
        try {
            await apiPost(`/api/battles/${battleId}/vote`, { option });
            toast.success("Vote registered");
            fetchBattles(); // Refresh
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div className="min-h-full bg-[#0B0F1E] p-6 lg:p-12 space-y-12">
            {/* Hero Section */}
            <header className="relative py-12 px-8 rounded-3xl bg-gradient-to-br from-[#111827] to-[#0B0F1E] border border-slate-700/30 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-accent/5 blur-[120px] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-brand-accent/10 border border-brand-accent/20">
                                <Swords className="text-brand-accent" size={24} />
                            </div>
                            <span className="text-xs font-black text-brand-accent uppercase tracking-[0.3em]">Oracle Proving Grounds</span>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-black text-white leading-none">THE BATTLE ARENA</h1>
                        <p className="max-w-xl text-slate-400 text-sm font-medium leading-relaxed">
                            Pit two market items against each other. Oracles decide the victor. 
                            Winning an Oracle Battle builds platform-wide influence.
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="group flex items-center gap-4 bg-brand-accent text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(139,92,246,0.2)]"
                    >
                        <Plus size={18} strokeWidth={3} /> Create Battle (100 Rep)
                    </button>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Active Duels", value: battles.length, icon: Swords, color: "text-brand-accent" },
                    { label: "Total Votes Cast", value: battles.reduce((acc, b) => acc + (b.totalVotesA || 0) + (b.totalVotesB || 0), 0), icon: Users, color: "text-emerald-400" },
                    { label: "Reputation Burned", value: (battles.length * 100).toLocaleString(), icon: Trophy, color: "text-amber-400" },
                ].map((stat, i) => (stat && (
                    <div key={i} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-6">
                        <div className={`p-4 rounded-xl bg-slate-800 ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{stat.value}</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</div>
                        </div>
                    </div>
                )))}
            </div>

            {/* Battles List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {loading ? (
                    <div className="col-span-full py-32 text-center">
                        <Loader2 className="animate-spin mx-auto text-brand-accent mb-4" size={48} />
                        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Synchronizing Arena State...</span>
                    </div>
                ) : battles.length === 0 ? (
                    <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-900 rounded-3xl group">
                        <p className="text-slate-500 font-bold mb-4">No active duels at the moment.</p>
                        <button onClick={() => setShowCreateModal(true)} className="text-brand-accent font-black text-xs uppercase tracking-widest hover:underline">Summon the first battle</button>
                    </div>
                ) : battles.map(b => (
                    <BattleCard key={b.id} battle={b} onVote={handleVote} />
                ))}
            </div>

            {/* Create Battle Modal (Simplified for now) */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateBattleModal 
                        onClose={() => setShowCreateModal(false)} 
                        onCreated={() => { setShowCreateModal(false); fetchBattles(); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function BattleCard({ battle, onVote }) {
    const totalVotes = (battle.totalVotesA || 0) + (battle.totalVotesB || 0);
    const percentA = totalVotes === 0 ? 50 : Math.round((battle.totalVotesA / totalVotes) * 100);
    const percentB = 100 - percentA;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-[#111827] border border-slate-700/30 rounded-3xl p-6 overflow-hidden transition-all hover:border-brand-accent/30"
        >
            <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                    <h3 className="text-lg font-black text-white group-hover:text-brand-accent transition-colors">{battle.title}</h3>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                            <Users size={12} /> By {battle.creator?.oracleHandle || battle.creator?.displayName}
                        </span>
                        <span className="text-[10px] font-black text-brand-accent uppercase flex items-center gap-1.5">
                            <Timer size={12} /> Ends {new Date(battle.endsAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    ACTIVE DUEL
                </div>
            </div>

            <p className="text-xs text-slate-400 font-medium mb-8 leading-relaxed italic border-l-2 border-brand-accent/20 pl-4">
                "{battle.question}"
            </p>

            <div className="grid grid-cols-2 gap-4 relative">
                {/* VS Overlay */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-[#111827] border border-slate-700/50 flex items-center justify-center shadow-xl">
                        <span className="text-[10px] font-black text-brand-accent italic">VS</span>
                    </div>
                </div>

                {/* Item A */}
                <div className="space-y-4">
                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/5 hover:border-brand-accent group-hover:shadow-[0_0_20px_rgba(56,189,248,0.1)] transition-all">
                        <ItemImage src={battle.itemA?.imageUrl} name={battle.itemA?.name || 'A'} size={200} rounded="rounded-none" className="!w-full !h-full !border-0" />
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="text-[10px] font-black text-white truncate">{battle.itemA?.name}</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => onVote(battle.id, 'A')}
                        className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-white hover:bg-brand-accent hover:text-[#0D1B2A] transition-all"
                    >
                        SUPPORT A ({percentA}%)
                    </button>
                </div>

                {/* Item B */}
                <div className="space-y-4">
                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/5 hover:border-brand-accent transition-all">
                        <ItemImage src={battle.itemB?.imageUrl} name={battle.itemB?.name || 'B'} size={200} rounded="rounded-none" className="!w-full !h-full !border-0" />
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="text-[10px] font-black text-white truncate">{battle.itemB?.name}</div>
                        </div>
                    </div>
                    <button 
                         onClick={() => onVote(battle.id, 'B')}
                        className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-white hover:bg-brand-accent hover:text-[#0D1B2A] transition-all"
                    >
                        SUPPORT B ({percentB}%)
                    </button>
                </div>
            </div>

            {/* Vote Bar */}
            <div className="mt-8 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-brand-accent transition-all duration-1000" style={{ width: `${percentA}%` }} />
                <div className="h-full bg-slate-700 transition-all duration-1000" style={{ width: `${percentB}%` }} />
            </div>
        </motion.div>
    );
}

function CreateBattleModal({ onClose, onCreated }) {
    const [title, setTitle] = useState("");
    const [question, setQuestion] = useState("");
    const [itemAId, setItemAId] = useState(null);
    const [itemBId, setItemBId] = useState(null);
    const [endsAt, setEndsAt] = useState("");
    const [loading, setLoading] = useState(false);
    const [itemsList, setItemsList] = useState([]);

    useEffect(() => {
        const fetchItems = async () => {
            const data = await apiGet('/api/items');
            setItemsList(data);
        };
        fetchItems();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !question || !itemAId || !itemBId || !endsAt) return toast.error("Complete the battle spec");
        if (itemAId === itemBId) return toast.error("Head-to-head must be different items");

        setLoading(true);
        try {
            await apiPost('/api/battles', { title, question, itemAId: parseInt(itemAId), itemBId: parseInt(itemBId), endsAt });
            toast.success("Battle Initiated!");
            onCreated();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 lg:p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0B0F1E]/95 backdrop-blur-xl" />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#111827] border border-slate-700/50 rounded-[40px] p-10 overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <Swords size={200} />
                </div>

                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">SUMMON A DUEL</h2>
                <p className="text-xs font-medium text-slate-500 mb-8 border-b border-white/5 pb-8">Requires 100 Reputation. Winners earn leaderboard points.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Duel Title</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The AI Arms Race" className="w-full bg-[#0B0F1E] border border-slate-700/30 rounded-2xl p-4 text-xs text-white focus:border-brand-accent outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Arena Closing Date</label>
                            <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="w-full bg-[#0B0F1E] border border-slate-700/30 rounded-2xl p-4 text-xs text-white focus:border-brand-accent outline-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">The Deciding Question</label>
                        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Which oracle will dominate public sentiment by next week?" className="w-full bg-[#0B0F1E] border border-slate-700/30 rounded-2xl p-4 text-xs text-white focus:border-brand-accent outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-6 pb-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Gladiator A</label>
                            <select value={itemAId || ""} onChange={e => setItemAId(e.target.value)} className="w-full bg-[#020617] border border-[#1E3A5F]/30 rounded-2xl p-4 text-xs text-white focus:border-brand-accent outline-none appearance-none">
                                <option value="">Select Item</option>
                                {itemsList.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Gladiator B</label>
                            <select value={itemBId || ""} onChange={e => setItemBId(e.target.value)} className="w-full bg-[#020617] border border-[#1E3A5F]/30 rounded-2xl p-4 text-xs text-white focus:border-brand-accent outline-none appearance-none">
                                <option value="">Select Item</option>
                                {itemsList.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <button 
                        disabled={loading}
                        className="w-full h-16 rounded-2xl bg-brand-accent text-white font-black uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(139,92,246,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "Initiate Duel"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
