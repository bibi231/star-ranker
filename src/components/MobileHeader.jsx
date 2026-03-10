import { Bell } from 'lucide-react';
import { useStore } from '../store/useStore';
import EpochIndicator from './epochs/EpochIndicator';

export default function MobileHeader() {
    const { balance } = useStore();

    return (
        <header
            className='h-14 flex items-center justify-between px-4
                 bg-[#0D1B2A]/95 backdrop-blur-sm
                 border-b border-white/10 sticky top-0 z-30 md:hidden'
            style={{ paddingTop: 'var(--safe-top)' }}
        >
            {/* LEFT: Logo */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-[#0D1B2A] font-black text-xl leading-none">
                    ★
                </div>
            </div>

            {/* CENTER: Compact Epoch Indicator */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="scale-75 origin-center">
                    <EpochIndicator />
                </div>
            </div>

            {/* RIGHT: Balance & Notifications */}
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mb-1">balance</p>
                    <div className="font-mono text-sm font-bold text-[#C9A84C] leading-none">
                        ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <button className="relative p-2 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors">
                    <Bell size={18} className="text-gray-300" />
                </button>
            </div>
        </header>
    );
}
