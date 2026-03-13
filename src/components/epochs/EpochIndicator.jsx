import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/storeModel';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Lock, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

export function EpochIndicator() {
    const { currentEpoch, serverTimeOffset, refreshCurrentCategory } = useStore();
    const [timeLeft, setTimeLeft] = useState(null);
    const [status, setStatus] = useState('stable'); // stable | closing | locking
    const lastEpochId = useRef(null);
    const [showRollover, setShowRollover] = useState(false);

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
        <div className="flex items-center gap-4">
            {/* Rollover Notification */}
            <AnimatePresence>
                {showRollover && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-brand-accent text-slate-950 font-black uppercase tracking-tighter shadow-2xl shadow-brand-accent/40 flex items-center gap-3 border border-white/20"
                    >
                        <ShieldCheck size={20} />
                        Epoch #{currentEpoch.epochId} Initiated • Multipliers Reset
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Indicator */}
            <div className={clsx(
                "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-500 backdrop-blur-md",
                status === 'stable' && "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5",
                status === 'closing' && "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10",
                status === 'locking' && "bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-2xl shadow-rose-500/20 animate-pulse"
            )}>
                <div className="flex flex-col">
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

                <div className="flex flex-col items-end group relative cursor-help">
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">
                        Status
                    </span>
                    <span className="text-[10px] font-bold uppercase leading-none px-2 py-1 rounded-md bg-white/10">
                        {status}
                    </span>

                    {/* Simple Tooltip */}
                    <div className="absolute top-full right-0 mt-2 w-48 p-3 rounded-xl bg-slate-900 border border-white/10 shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none z-50">
                        <div className="flex items-center gap-2 mb-1 text-white font-bold text-[10px]">
                            <Info size={12} className="text-brand-accent" />
                            {status === 'stable' && "Accumulation Phase"}
                            {status === 'closing' && "Closing Soon"}
                            {status === 'locking' && "Staking Disabled"}
                        </div>
                        <p className="text-[9px] text-slate-400 leading-relaxed italic">
                            {status === 'stable' && "Rankings are evolving smoothly. All actions permitted."}
                            {status === 'closing' && "Epoch boundary approaching. Finalize your stakes now."}
                            {status === 'locking' && "Markets are locking for snapshot. Only voting is allowed."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EpochIndicator;
