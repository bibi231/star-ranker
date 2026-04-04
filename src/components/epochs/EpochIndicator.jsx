import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/storeModel';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Lock, ShieldCheck, Zap, Info, Shield, CheckCircle2, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

export function EpochIndicator() {
    const { currentEpoch, serverTimeOffset, refreshCurrentCategory } = useStore();
    const [timeLeft, setTimeLeft] = useState(null);
    const [status, setStatus] = useState('stable'); // stable | closing | locking
    const lastEpochId = useRef(null);
    const [showRollover, setShowRollover] = useState(false);
    const [showMobileDetails, setShowMobileDetails] = useState(false);

    useEffect(() => {
        if (!currentEpoch) return;

        // Check for rollover
        if (lastEpochId.current && lastEpochId.current !== currentEpoch.epochId) {
            setShowRollover(true);
            refreshCurrentCategory();
            setTimeout(() => setShowRollover(false), 5000);
        }
        lastEpochId.current = currentEpoch.epochId;

        const timer = setInterval(() => {
            const nowServer = Date.now() + serverTimeOffset;
            const remaining = Math.max(0, currentEpoch.endTime - nowServer);

            setTimeLeft(remaining);

            const secondsRemaining = remaining / 1000;
            if (secondsRemaining <= 60) setStatus('locking');
            else if (secondsRemaining <= 300) setStatus('closing');
            else setStatus('stable');
        }, 1000);

        return () => clearInterval(timer);
    }, [currentEpoch, serverTimeOffset]);

    if (!currentEpoch || timeLeft === null) return null;

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-4 relative">
            {/* Rollover Notification */}
            <AnimatePresence>
                {showRollover && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl bg-brand-accent text-slate-950 font-black uppercase tracking-tighter shadow-2xl shadow-brand-accent/40 flex items-center gap-3 border border-white/20"
                    >
                        <ShieldCheck size={20} />
                        Epoch #{currentEpoch.epochId} Initiated • Multipliers Reset
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Indicator */}
            <button 
                onClick={() => setShowMobileDetails(!showMobileDetails)}
                className={clsx(
                    "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-500 backdrop-blur-md active:scale-95 group",
                    status === 'stable' && "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/40",
                    status === 'closing' && "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10 hover:border-amber-500/50",
                    status === 'locking' && "bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-2xl shadow-rose-500/20 animate-pulse hover:border-rose-500/60"
                )}
            >
                <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">
                        Epoch #{currentEpoch.epochId}
                    </span>
                    <div className="flex items-center gap-2">
                        {status === 'locking' ? <Lock size={14} className="animate-bounce" /> : <Clock size={14} />}
                        <span className="text-sm font-mono font-bold leading-none">
                            {status === 'locking' ? "LOCKING" : formatTime(timeLeft)}
                        </span>
                    </div>
                </div>

                <div className="h-8 w-px bg-current opacity-20 mx-1" />

                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">
                        Status
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/10">
                        <div className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            status === 'stable' ? "bg-emerald-500" :
                            status === 'closing' ? "bg-amber-500" : "bg-rose-500"
                        )} />
                        <span className="text-[10px] font-bold uppercase leading-none">
                            {status}
                        </span>
                    </div>
                </div>
            </button>

            {/* Interactive Details Popup */}
            <AnimatePresence>
                {showMobileDetails && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMobileDetails(false)}
                            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed md:absolute bottom-20 md:top-full left-4 right-4 md:left-auto md:right-0 md:mt-2 md:w-72 z-50 p-5 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
                        >
                            <div className="relative space-y-4">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Shield size={12} className="text-brand-accent" /> Network Status
                                    </h4>
                                    <button onClick={() => setShowMobileDetails(false)} className="text-slate-500 hover:text-white">
                                        <Info size={14} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <StatusStep 
                                        icon={<Zap size={14} />}
                                        title="Influence Phase"
                                        desc="Stakes are being committed to the protocol."
                                        active={status === 'stable'}
                                        completed={status === 'closing' || status === 'locking'}
                                    />
                                    <StatusStep 
                                        icon={<TrendingUp size={14} />}
                                        title="Closing Window"
                                        desc="Final adjustments before settlement snapshot."
                                        active={status === 'closing'}
                                        completed={status === 'locking'}
                                    />
                                    <StatusStep 
                                        icon={<Lock size={14} />}
                                        title="Snapshot Lock"
                                        desc="Rankings frozen for reputation distribution."
                                        active={status === 'locking'}
                                        completed={false}
                                    />
                                </div>

                                <div className="pt-2">
                                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-white uppercase">Reification Logic</p>
                                            <p className="text-[8px] text-emerald-500/70 font-bold uppercase tracking-tight">Settlement Guaranteed</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatusStep({ icon, title, desc, active, completed }) {
    return (
        <div className={clsx(
            "flex gap-4 transition-all duration-300",
            !active && !completed ? "opacity-30 grayscale" : "opacity-100"
        )}>
            <div className={clsx(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                active ? "bg-brand-accent/20 border-brand-accent text-brand-accent" :
                completed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                "bg-slate-950 border-slate-800 text-slate-700"
            )}>
                {completed ? <CheckCircle2 size={16} /> : icon}
            </div>
            <div className="flex flex-col justify-center">
                <p className={clsx(
                    "text-[10px] font-black uppercase tracking-widest",
                    active ? "text-brand-accent" : completed ? "text-emerald-500" : "text-slate-500"
                )}>
                    {title}
                </p>
                <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">{desc}</p>
            </div>
        </div>
    );
}

export default EpochIndicator;
