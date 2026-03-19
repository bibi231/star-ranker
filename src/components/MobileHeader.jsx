import React from 'react';
import { Menu, Zap, Bell } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { EpochIndicator } from './epochs/EpochIndicator';

export default function MobileHeader({ onMenuClick, onFundClick, onNotifClick, unreadCount }) {
    const { balance = 0, formatValue } = useStore();

    const displayBalance = typeof formatValue === 'function' ? formatValue(balance) : `$${balance.toLocaleString()}`;

    return (
        <header
            className='h-14 flex items-center justify-between px-4
                 bg-[#0D1B2A]/95 backdrop-blur-sm
                 border-b border-white/10 sticky top-0 z-[100] md:hidden'
            style={{ paddingTop: 'var(--safe-top)' }}
        >
            {/* LEFT: Menu Toggle */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors text-slate-400"
                >
                    <Menu size={24} />
                </button>
                <img src="/assets/logo-horizontal.png" alt="Logo" className="h-14 w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
            </div>

            {/* CENTER: Compact Epoch Indicator */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="scale-75 origin-center">
                    <EpochIndicator />
                </div>
            </div>

            {/* RIGHT: Balance & Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onFundClick}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase tracking-wider"
                >
                    Fund
                </button>
                <div className="text-right ml-1">
                    <div className="font-mono text-sm font-bold text-[#C9A84C] leading-none">
                        {displayBalance}
                    </div>
                </div>
            </div>
        </header>
    );
}
