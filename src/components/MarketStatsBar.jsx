import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Coins, Droplets, Users, Clock } from 'lucide-react';
import { useStore } from '../store/storeModel';

/**
 * MarketStatsBar — Polymarket-style horizontal stat strip for a market hero.
 * Renders 4 KPI tiles: Volume, Liquidity, Holders, Time-to-Settle.
 *
 * Props:
 *   market: object with totalVotes, score, totalStakers (optional), epochEndsAt (optional)
 */
export default function MarketStatsBar({ market = {} }) {
    const { currentEpoch, serverTimeOffset, formatValue } = useStore();

    const stats = useMemo(() => {
        const volume = market.totalVolume ?? market.totalVotes ?? 0;
        const liquidity = market.liquidity ?? Math.round((market.score ?? 0) * 0.7);
        const holders = market.totalStakers ?? market.uniqueStakers ?? 0;
        const change24h = market.change24h ?? 0;
        return { volume, liquidity, holders, change24h };
    }, [market]);

    const timeToSettle = useMemo(() => {
        const ends = market.epochEndsAt || currentEpoch?.endsAt;
        if (!ends) return null;
        const now = Date.now() + (serverTimeOffset || 0);
        const ms = new Date(ends).getTime() - now;
        if (ms <= 0) return 'Settling…';
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m ${secs.toString().padStart(2, '0')}s`;
    }, [market.epochEndsAt, currentEpoch?.endsAt, serverTimeOffset]);

    const tiles = [
        {
            icon: Coins,
            label: 'Volume',
            value: typeof formatValue === 'function' ? formatValue(stats.volume) : stats.volume.toLocaleString(),
            color: 'text-amber-400',
        },
        {
            icon: Droplets,
            label: 'Liquidity',
            value: typeof formatValue === 'function' ? formatValue(stats.liquidity) : stats.liquidity.toLocaleString(),
            color: 'text-cyan-400',
        },
        {
            icon: Users,
            label: 'Holders',
            value: stats.holders.toLocaleString(),
            color: 'text-emerald-400',
        },
        {
            icon: stats.change24h >= 0 ? TrendingUp : TrendingDown,
            label: '24h Change',
            value: `${stats.change24h >= 0 ? '+' : ''}${stats.change24h.toFixed(2)}%`,
            color: stats.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tiles.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="p-3 md:p-4 rounded-xl bg-slate-950/60 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon size={12} className={color} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                    </div>
                    <p className={`text-base md:text-lg font-black tracking-tight ${color}`}>{value}</p>
                </div>
            ))}
            {timeToSettle && (
                <div className="md:col-span-4 p-3 rounded-xl bg-slate-950/40 border border-amber-500/20 flex items-center gap-3">
                    <Clock size={14} className="text-amber-400 shrink-0" />
                    <div className="flex-1 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time to next settlement</span>
                        <span className="text-sm font-black text-amber-400 tabular-nums">{timeToSettle}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
