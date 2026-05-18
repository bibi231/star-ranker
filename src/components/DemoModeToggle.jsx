import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/storeModel';
import { Zap, ShieldCheck, Activity, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export const DemoModeToggle = () => {
    const { isDemoMode, setDemoMode, balance, user } = useStore();

    const handleToggle = () => {
        if (!user) {
            toast.error("Sign in to switch modes");
            return;
        }

        const newMode = !isDemoMode;
        
        if (!newMode && balance <= 0) {
            toast((t) => (
                <div className="flex flex-col gap-3 p-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="font-black text-[10px] uppercase tracking-widest text-amber-500">Security Warning</span>
                    </div>
                    <span className="text-[11px] leading-relaxed text-slate-300">Insufficient core balance for Live Deployment. Real stakes require an NGN deposit.</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                toast.dismiss(t.id);
                                useStore.getState().setDepositOpen(true);
                            }}
                            className="bg-brand-accent text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 hover:brightness-110 transition-all shadow-lg shadow-brand-accent/20"
                        >
                            Deposit
                        </button>
                        <button 
                            onClick={() => toast.dismiss(t.id)}
                            className="bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            ), { duration: 5000, style: { background: '#0B0F1E', border: '1px solid #1e293b' } });
        }

        setDemoMode(newMode);
        toast.success(newMode ? "Simulated Protocol: Practice Active" : "Operational Mode: Live Deployment", {
            icon: newMode ? <Cpu className="text-amber-500" /> : <Activity className="text-brand-accent" />,
            style: {
                background: '#0B0F1E',
                color: '#fff',
                border: `1px solid ${newMode ? '#f59e0b' : '#38bdf8'}`,
                fontSize: '11px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
            }
        });
    };

    return (
        <div className="group relative flex items-center">
            {/* Background Container */}
            <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-xl border border-white/5 p-1 rounded-2xl shadow-2xl overflow-hidden">
                
                {/* Labels Section */}
                <div className="pl-4 pr-1 py-1 flex flex-col justify-center min-w-[70px]">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Network</span>
                    <AnimatePresence mode="wait">
                        <motion.span 
                            key={isDemoMode ? 'practice' : 'live'}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 5 }}
                            className={cn(
                                "text-[10px] font-black uppercase tracking-[0.15em]",
                                isDemoMode ? 'text-amber-500' : 'text-brand-accent'
                            )}
                        >
                            {isDemoMode ? 'Simulation' : 'Live Core'}
                        </motion.span>
                    </AnimatePresence>
                </div>

                {/* Switcher Button */}
                <button
                    onClick={handleToggle}
                    className={cn(
                        "relative w-20 h-10 rounded-xl transition-all duration-500 flex items-center p-1 cursor-pointer overflow-hidden group",
                        isDemoMode ? 'bg-amber-500/5' : 'bg-brand-accent/5'
                    )}
                >
                    {/* Visual Tracks */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent" />
                    </div>

                    {/* The Knob / Slider */}
                    <motion.div
                        animate={{ x: isDemoMode ? 0 : 40 }}
                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                        className={cn(
                            "relative z-10 w-9 h-8 rounded-lg flex items-center justify-center shadow-2xl transition-all duration-300",
                            isDemoMode 
                              ? 'bg-amber-500 shadow-amber-500/40' 
                              : 'bg-brand-accent shadow-brand-accent/40'
                        )}
                    >
                        {isDemoMode ? (
                            <Cpu size={16} className="text-black" strokeWidth={3} />
                        ) : (
                            <Activity size={16} className="text-black" strokeWidth={3} />
                        )}

                        {/* Scanner Effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent animate-pulse" />
                    </motion.div>

                    {/* Mode Icons in the background */}
                    <div className="absolute inset-0 px-3 flex items-center justify-between pointer-events-none opacity-20 grayscale">
                        <Cpu size={14} className={cn(isDemoMode ? 'text-amber-500' : 'text-slate-500')} />
                        <Activity size={14} className={cn(!isDemoMode ? 'text-brand-accent' : 'text-slate-500')} />
                    </div>
                </button>
            </div>

            {/* Ambient Outer Glow */}
            <div className={cn(
                "absolute inset-0 -z-10 blur-2xl opacity-10 transition-colors duration-700",
                isDemoMode ? 'bg-amber-500' : 'bg-brand-accent'
            )} />
        </div>
    );
};
