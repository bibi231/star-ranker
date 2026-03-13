export default function MobileHeader({ onMenuClick, onFundClick }) {
    const { balance, formatValue } = useStore();

    return (
        <header
            className='h-14 flex items-center justify-between px-4
                 bg-[#0D1B2A]/95 backdrop-blur-sm
                 border-b border-white/10 sticky top-0 z-30 md:hidden'
            style={{ paddingTop: 'var(--safe-top)' }}
        >
            {/* LEFT: Menu Toggle */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors text-slate-400"
                >
                    <Menu size={20} />
                </button>
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
                        {formatValue(balance)}
                    </div>
                </div>
            </div>
        </header>
    );
}

// Add Menu import
import { Bell, Menu } from 'lucide-react';
