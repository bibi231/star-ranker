import React from 'react';
import { Menu, Bell, PlusCircle, ChevronDown } from 'lucide-react';
import { useStore } from '../store/storeModel';

export default function MobileHeader({ onMenuClick, onFundClick, onNotifClick, unreadCount }) {
    const { balance = 0, formatValue, currentEpoch, currency } = useStore();

    const displayBalance = typeof formatValue === 'function' ? formatValue(balance) : `$${balance.toLocaleString()}`;

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

            {/* CENTER: Compact epoch badge — only shows on wider phones */}
            {epochLabel && (
                <div className="hidden min-[400px]:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/20 shrink-0 mx-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                        {epochLabel}
                    </span>
                </div>
            )}

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
                    <span className="font-mono text-xs font-bold text-[#C9A84C] leading-none whitespace-nowrap">
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
        </header>
    );
}
