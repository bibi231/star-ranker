import React from 'react';
import { Menu, Bell, PlusCircle, ChevronDown } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { NotificationsPanel } from './NotificationsPanel';
import { cn } from '../lib/utils';

import { AnimatePresence, motion } from 'framer-motion';

function CompactEpochTracker() {
    const { currentEpoch, serverTimeOffset } = useStore();
    const [status, setStatus] = React.useState('stable');
    const [timeLeftStr, setTimeLeftStr] = React.useState('');
    const [showPopup, setShowPopup] = React.useState(false);
    const popupRef = React.useRef(null);

    React.useEffect(() => {
        if (!currentEpoch) return;
        const timer = setInterval(() => {
            const nowServer = Date.now() + serverTimeOffset;
            const remaining = Math.max(0, currentEpoch.endTime - nowServer);
            const secondsRemaining = remaining / 1000;
            
            const mins = Math.floor(secondsRemaining / 60);
            const secs = Math.floor(secondsRemaining % 60);
            setTimeLeftStr(`${mins}:${secs.toString().padStart(2, '0')}`);

            if (secondsRemaining <= 60) setStatus('locking');
            else if (secondsRemaining <= 300) setStatus('closing');
            else setStatus('stable');
        }, 1000);
        return () => clearInterval(timer);
    }, [currentEpoch, serverTimeOffset]);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setShowPopup(false);
            }
        };
        if (showPopup) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPopup]);

    if (!currentEpoch) return null;

    let phaseDesc = "Market is open for staking and voting.";
    if (status === "closing") phaseDesc = "Epoch closing soon. Finalize positions.";
    if (status === "locking") phaseDesc = "Stakes locked. Preparing to settle.";

    return (
        <div className="relative" ref={popupRef}>
            <div 
                className={cn(
                    "hidden min-[400px]:flex items-center gap-1 px-2 py-1 rounded-lg shrink-0 mx-1 border cursor-pointer select-none transition-colors",
                    status === 'stable' && "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10",
                    status === 'closing' && "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20",
                    status === 'locking' && "bg-rose-500/20 border-rose-500/40 animate-pulse hover:bg-rose-500/30"
                )}
                onClick={() => setShowPopup(p => !p)}
            >
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    status === 'stable' && "bg-emerald-500 animate-pulse",
                    status === 'closing' && "bg-amber-500 animate-pulse",
                    status === 'locking' && "bg-rose-500"
                )} />
                <span className={cn(
                    "text-[9px] font-black uppercase tracking-wider whitespace-nowrap",
                    status === 'stable' && "text-emerald-400",
                    status === 'closing' && "text-amber-400",
                    status === 'locking' && "text-rose-400"
                )}>
                    {status === 'locking' ? 'LOCK' : `E${currentEpoch.epochId}`}
                </span>
            </div>

            <AnimatePresence>
                {showPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full lg:left-1/2 lg:-translate-x-1/2 left-0 mt-2 w-56 z-50 p-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col gap-2"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Epoch #{currentEpoch.epochId}
                            </span>
                            <span className={cn(
                                "text-xs font-mono font-bold",
                                status === 'stable' && "text-emerald-400",
                                status === 'closing' && "text-amber-400",
                                status === 'locking' && "text-rose-400"
                            )}>
                                {timeLeftStr}
                            </span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-300 leading-snug">
                            {phaseDesc}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function MobileHeader({ onMenuClick, onFundClick, onNotifClick, unreadCount, isNotifOpen, setNotifOpen }) {
    const { balance = 0, demoBalance = 0, isDemoMode, formatValue, currency, currentEpoch } = useStore();

    const displayBalance = isDemoMode 
        ? `★${demoBalance.toLocaleString()}` 
        : (typeof formatValue === 'function' ? formatValue(balance) : `$${balance.toLocaleString()}`);

    // Compact epoch display — just the countdown, no labels
    const epochLabel = currentEpoch ? `E${currentEpoch.epochId}` : null;

    return (
        <header
            className='flex items-center justify-between px-3 py-2
                 bg-[#0D1B2A]/95 backdrop-blur-sm
                 border-b border-white/10 sticky top-0 z-[100] md:hidden'
            style={{ paddingTop: 'var(--safe-top)' }}
        >
            {/* LEFT: Menu + Logo (compact) */}
            <div className="flex items-center gap-1 shrink-0 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-1 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors text-slate-400 shrink-0"
                >
                    <Menu size={22} />
                </button>
                <img
                    src="/assets/logo-horizontal.png"
                    alt="Logo"
                    className="h-8 w-auto drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] shrink-0"
                    data-tour="header-logo"
                />
            </div>

            {/* CENTER: Compact epoch badge — dynamic status */}
            <CompactEpochTracker />

            {/* RIGHT: Currency badge + Balance + Fund + Notif */}
            <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1 shrink-0 relative">
                    <div className="relative flex items-center">
                        <select 
                            value={currency || 'USD'}
                            onChange={(e) => useStore.getState().setCurrency(e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        >
                            <option value="USD">USD</option>
                            <option value="NGN">NGN</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                        </select>
                        <span className="text-[8px] font-black text-brand-accent bg-[#1E3A5F]/50 border border-brand-accent/20 px-1 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wider pointer-events-none">
                            {currency || 'USD'}
                            <ChevronDown size={8} />
                        </span>
                    </div>
                    <span className={cn("font-mono text-xs font-bold leading-none whitespace-nowrap", isDemoMode ? "text-amber-400" : "text-[#C9A84C]")}>
                        {displayBalance}
                    </span>
                </div>

                <button
                    onClick={onFundClick}
                    className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 transition-all active:scale-95 shrink-0"
                    title="Fund Wallet"
                >
                    <PlusCircle size={16} />
                </button>

                <div className="relative">
                    <button
                        onClick={onNotifClick}
                        className="relative p-1.5 rounded-lg hover:bg-white/5 text-slate-400 transition-all active:scale-95 shrink-0"
                        title="Notifications"
                    >
                        <Bell size={16} />
                        {unreadCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
