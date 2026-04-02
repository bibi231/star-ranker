import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/storeModel';
import { TrendingUp, Wallet, ArrowRight, X, Trophy, Coins } from 'lucide-react';

export const DemoConversionModal = () => {
    const { showDemoConversion, setShowDemoConversion, demoStats, setDemoMode, setDepositOpen } = useStore();

    if (!showDemoConversion) return null;

    const handleGoReal = () => {
        setShowDemoConversion(false);
        setDemoMode(false);
        setDepositOpen(true);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowDemoConversion(false)}
                    className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                />

                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#22d3ee]/30 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(34,211,238,0.15)]"
                >
                    {/* Header Image/Pattern */}
                    <div className="h-32 bg-gradient-to-br from-[#22d3ee]/20 to-purple-500/20 flex items-center justify-center relative border-b border-white/5">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500 via-transparent to-transparent" />
                        <Trophy size={48} className="text-[#22d3ee] drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                        <button 
                            onClick={() => setShowDemoConversion(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X size={18} className="text-white/40" />
                        </button>
                    </div>

                    <div className="p-8 text-center">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2 italic">
                            Practice Over. <span className="text-[#22d3ee]">Time to Win Real.</span>
                        </h2>
                        <p className="text-white/60 text-sm mb-8 max-w-sm mx-auto uppercase tracking-wide font-medium leading-relaxed">
                            That <span className="text-white font-bold">₦{demoStats?.totalEarned?.toLocaleString()}</span> you earned in demo mode was fake. <br/>
                            <span className="text-cyan-400">But your predictions were 100% real.</span>
                        </p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">Win Rate</span>
                                <span className="text-2xl font-black text-white">{demoStats?.winRate}%</span>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl italic">
                                <span className="text-[10px] uppercase font-bold text-[#22d3ee]/60 block mb-1">Total Payouts</span>
                                <span className="text-2xl font-black text-[#22d3ee]">₦{demoStats?.totalEarned?.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Incentive Box */}
                        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 p-6 rounded-3xl mb-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
                                <Coins size={64} className="text-cyan-400" />
                            </div>
                            <div className="relative z-10 text-left">
                                <h4 className="text-[#22d3ee] font-black uppercase tracking-tight text-xs mb-1">Limited Time Launch Bonus</h4>
                                <p className="text-white font-black text-2xl uppercase tracking-tighter italic leading-none mb-2">
                                    Get <span className="text-yellow-400">₦500 Extra</span>
                                </p>
                                <p className="text-white/50 text-[10px] uppercase font-bold tracking-tight">
                                    On your first deposit of ₦2,000 or more
                                </p>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleGoReal}
                                className="group relative w-full bg-[#22d3ee] text-black font-black uppercase tracking-tighter py-4 rounded-2xl flex items-center justify-center gap-2 overflow-hidden hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                                <Wallet size={20} strokeWidth={2.5} />
                                Claim Bonus & Go Real
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button 
                                onClick={() => setShowDemoConversion(false)}
                                className="w-full text-white/40 hover:text-white/60 font-bold uppercase tracking-widest text-[10px] py-2 transition-colors"
                            >
                                Keep Practicing (Demo Mode)
                            </button>
                        </div>
                    </div>

                    {/* Footer decoration */}
                    <div className="h-1 bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
