import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Shield, Brain, Star, CheckCircle2, ChevronRight, Loader2, Sparkles, Trophy, RotateCcw } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import ItemImage from '../components/ItemImage';
import toast from 'react-hot-toast';

export function OracleTrialPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);

    const fetchItems = async () => {
        try {
            const data = await apiGet('/api/trials');
            setItems(data.items);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load today's trial");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await apiPost('/api/trials/submit', { 
                trialId: (await apiGet('/api/trials')).trialId, // Simple way to get the ID back
                guessOrder: items.map(i => i.id) 
            });
            setResults(res);
            toast.success(`Calibration Complete: ${res.score}% Accuracy`, {
                icon: '🧠',
                style: { background: '#0D1B2A', color: '#fff', border: '1px solid #38bdf8' }
            });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-12">
                 <Loader2 size={48} className="animate-spin text-brand-accent mb-6" />
                 <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Calibrating Neural Sync...</span>
            </div>
        );
    }

    if (results) {
        return <TrialResults results={results} onReset={() => { setResults(null); fetchItems(); }} />;
    }

    return (
        <div className="min-h-full bg-[#0B0F1E] p-6 lg:p-12 max-w-4xl mx-auto space-y-12">
             {/* Header */}
             <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 bg-brand-accent/5 border border-brand-accent/20 px-4 py-2 rounded-2xl">
                    <Brain className="text-brand-accent" size={18} />
                    <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Calibration Protocol-X</span>
                </div>
                <h1 className="text-4xl lg:text-6xl font-black text-white leading-tight uppercase tracking-tighter">DAILY ORACLE TRIAL</h1>
                <p className="max-w-xl mx-auto text-slate-400 text-sm font-medium">
                    Test your intuition. Rank these 5 items by their platform score from <span className="text-white italic">Highest to Lowest</span>. 
                    Drag items to reorder. 100% accuracy earns 100 Reputation.
                </p>
            </div>

            {/* Hint Box */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-center gap-4">
                <Sparkles size={16} className="text-amber-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TIP: Monitor current market sentiment before starting</span>
            </div>

            {/* Trial Arena - Using Reorder from Framer Motion */}
            <div className="space-y-4 relative">
                <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between py-4 pointer-events-none opacity-20">
                    {[1,2,3,4,5].map(i => <span key={i} className="text-xs font-black text-white italic">0{i}</span>)}
                </div>
                
                <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-4">
                    {items.map((item, index) => (
                        <Reorder.Item 
                            key={item.id} 
                            value={item}
                            className="bg-[#111827] border border-slate-700/30 p-5 rounded-3xl flex items-center justify-between group cursor-grab active:cursor-grabbing hover:border-brand-accent/50 transition-all"
                        >
                            <div className="flex items-center gap-6">
                                <ItemImage src={item.imageUrl} name={item.name} size={64} rounded="rounded-2xl" className="group-hover:border-brand-accent transition-all shadow-xl" />
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-white uppercase group-hover:text-brand-accent transition-colors">{item.name}</h3>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Unknown Market Value</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 pr-2">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                                     <Star size={14} className="text-slate-500" />
                                </div>
                                <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em]">Pos 0{index + 1}</span>
                            </div>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            </div>

            {/* Action Bar */}
            <div className="pt-8 flex justify-center">
                <button 
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="group relative bg-brand-accent text-white px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(139,92,246,0.2)] hover:scale-105 active:scale-95 transition-all overflow-hidden"
                >
                    <div className="flex items-center gap-4 relative z-10">
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} strokeWidth={3} />}
                        Initiate Calibration
                    </div>
                </button>
            </div>
        </div>
    );
}

function TrialResults({ results, onReset }) {
    return (
        <div className="min-h-full bg-[#0B0F1E] p-6 lg:p-12 max-w-4xl mx-auto space-y-12">
            <header className="text-center space-y-4">
                 <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex mx-auto w-24 h-24 items-center justify-center bg-brand-accent/10 border border-brand-accent/20 rounded-full mb-4"
                >
                    <Trophy className="text-brand-accent" size={48} />
                </motion.div>
                <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight uppercase italic tracking-tighter">
                    {results.score}% ACCURACY
                </h1>
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Daily Calibration Results Synced</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-12">
                <div className="space-y-6">
                    <h3 className="text-xs font-black text-brand-accent uppercase tracking-widest border-b border-brand-accent/20 pb-4">CORRECT ORDER</h3>
                    <div className="space-y-3">
                        {results.correctOrderDetails.map((item, i) => (
                            <div key={item.id} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                     <span className="text-xs font-black text-emerald-500 font-mono italic">#{i+1}</span>
                                     <span className="text-xs font-black text-white uppercase">{item.name}</span>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-400 font-black">{Math.floor(item.score).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-10 rounded-[3rem] bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                         <Star size={32} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-white mb-2 italic">CALIBRATED</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                            Intuition Sync complete. Your calibration score has been recorded for today's seasonal leaderboard calculation.
                        </p>
                    </div>
                    <button 
                        onClick={onReset}
                        className="mt-4 flex items-center gap-3 text-brand-accent font-black text-[10px] uppercase tracking-widest hover:underline"
                    >
                        <RotateCcw size={14} /> Reopen Arena
                    </button>
                </div>
            </div>
        </div>
    );
}
