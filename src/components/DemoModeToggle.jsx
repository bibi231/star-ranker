import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/storeModel';
import { Zap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const DemoModeToggle = () => {
    const { isDemoMode, setDemoMode, balance, demoBalance, user } = useStore();

    const handleToggle = () => {
        if (!user) {
            toast.error("Sign in to switch modes");
            return;
        }

        const newMode = !isDemoMode;
        
        if (!newMode && balance <= 0) {
            toast((t) => (
                <span className="flex flex-col gap-2">
                    <span className="font-bold text-yellow-500">Suggestion: Deposit Needed</span>
                    <span>Deposit NGN to place real stakes.</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                toast.dismiss(t.id);
                                useStore.getState().setDepositOpen(true);
                            }}
                            className="bg-cyan-500 text-black px-3 py-1 rounded text-xs font-bold uppercase tracking-tighter flex-1"
                        >
                            Deposit Now
                        </button>
                        <button 
                            onClick={() => toast.dismiss(t.id)}
                            className="bg-slate-800 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-tighter"
                        >
                            Dismiss
                        </button>
                    </div>
                </span>
            ), { duration: 5000 });
        }

        setDemoMode(newMode);
        toast.success(newMode ? "Demo Mode Active (Practice)" : "Real Mode Active (High Stakes)", {
            icon: newMode ? <Zap className="text-yellow-400" /> : <ShieldCheck className="text-cyan-400" />,
            style: {
                background: '#0a0a0a',
                color: '#fff',
                border: `1px solid ${newMode ? '#fbbf24' : '#22d3ee'}`,
            }
        });
    };

    return (
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-2xl">
            <div className="flex flex-col items-end mr-1">
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 leading-none">Account Mode</span>
                <AnimatePresence mode="wait">
                    <motion.span 
                        key={isDemoMode ? 'demo' : 'real'}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className={`text-[11px] font-bold uppercase tracking-tighter ${isDemoMode ? 'text-yellow-400' : 'text-cyan-400'}`}
                    >
                        {isDemoMode ? 'Practice' : 'Live'}
                    </motion.span>
                </AnimatePresence>
            </div>

            <button
                onClick={handleToggle}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center px-1 ${
                    isDemoMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-cyan-500/20 border-cyan-500/50'
                } border`}
            >
                <motion.div
                    animate={{ x: isDemoMode ? 0 : 24 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-4 h-4 rounded-full flex items-center justify-center shadow-lg ${
                        isDemoMode ? 'bg-yellow-400' : 'bg-cyan-400'
                    }`}
                >
                    {isDemoMode ? (
                        <Zap size={10} className="text-black" strokeWidth={3} />
                    ) : (
                        <ShieldCheck size={10} className="text-black" strokeWidth={3} />
                    )}
                </motion.div>
                
                {/* Visual Glow */}
                <div className={`absolute inset-0 rounded-full blur-md opacity-20 ${
                    isDemoMode ? 'bg-yellow-400' : 'bg-cyan-400'
                }`} />
            </button>
        </div>
    );
};
