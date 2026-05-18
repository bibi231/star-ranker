import React, { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, Zap, ChevronUp, ChevronDown, ShieldAlert, Loader2, Bookmark, BookmarkCheck } from 'lucide-react';
import ItemImage from './ItemImage';
import { cn } from '../lib/utils';
import { useStore } from '../store/storeModel';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { useWatchlist } from '../hooks/useWatchlist';
import { useVirtualizer } from '@tanstack/react-virtual';

const RankingRow = React.memo(({ 
    item, 
    index, 
    currentVote, 
    isTracked, 
    totalScore, 
    formatValue, 
    activeFilter, 
    vote, 
    toggleWatchlist, 
    openModal, 
    navigate, 
    userPowerVotes 
}) => {
    return (
        <div 
            className="glass-panel card-hover transition-all group cursor-pointer border border-slate-800/50 mb-1 rounded-xl overflow-hidden"
            onClick={() => navigate(`/market/${item.docId}`)}
        >
            <div className="flex items-center px-6 py-3">
                {/* Rank */}
                <div className="w-16 shrink-0 text-center flex flex-col items-center justify-center">
                    <span className={cn(
                        "font-mono text-base font-black italic leading-none",
                        index === 0 ? "text-amber-400" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-700" : "text-slate-600",
                        activeFilter !== 'all' && "text-sm"
                    )}>
                        #{index + 1}
                    </span>
                    
                    {/* Implied Probability (Currency) */}
                    <span className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-tighter bg-slate-950/80 px-1 py-0.5 rounded border border-slate-800">
                        {formatValue(Math.max(0.01, (Math.max(0, item.score || 0) / totalScore)))}
                    </span>

                    {activeFilter !== 'all' && item.rankChange !== undefined && (
                        <span className={cn(
                            "text-[9px] font-black mt-0.5",
                            item.rankChange < 0 ? "text-emerald-500" : item.rankChange > 0 ? "text-rose-500" : "text-slate-500"
                        )}>
                            {item.rankChange < 0 ? '▲ +' : item.rankChange > 0 ? '▼ -' : '— '}{Math.abs(item.rankChange)}
                        </span>
                    )}
                </div>

                {/* Oracle Context */}
                <div className="flex-1 flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                        <ItemImage src={item.imageUrl} name={item.name} size={40} className="group-hover:border-brand-accent/30 transition-all" />
                        {index === 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-bl flex items-center justify-center z-10"><Star size={6} fill="black" /></div>}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-black text-white tracking-tight text-xs truncate">{item.name}</span>
                            {item.symbol && <span className="text-[8px] text-slate-600 font-bold">{item.symbol}</span>}
                            {item.isSponsored && (
                                <div className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded flex items-center gap-1 shrink-0 animate-pulse">
                                    <span className="text-[7px] font-black text-amber-500 tracking-widest">{item.sponsorLabel || 'SPONSORED'}</span>
                                </div>
                            )}
                            {item.isDampened && (
                                <ShieldAlert size={10} className="text-brand-accent animate-pulse shrink-0" />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] text-slate-500 font-black tracking-widest shrink-0">Vol: {item.totalVotes?.toLocaleString()}</span>
                            <Sparkline data={item.trend} color={item.velocity >= 0 ? "#10b981" : "#ef4444"} />
                        </div>
                    </div>
                </div>

                {/* Score */}
                <div className="w-28 shrink-0 text-right">
                    <span className="font-mono text-xs font-black text-slate-100 italic">
                        {Math.floor(item.score || 0).toLocaleString()}
                    </span>
                </div>

                {/* Velocity */}
                <div className="w-28 shrink-0 text-right pr-4">
                    <div className={cn(
                        "inline-flex items-center gap-1 font-mono text-[9px] font-black px-2 py-0.5 rounded-lg",
                        (item.velocity || 0) >= 0
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                    )}>
                        {(item.velocity || 0) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(item.velocity || 0).toFixed(1)}%
                    </div>
                </div>

                {/* Operations */}
                <div className="w-48 shrink-0 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => toggleWatchlist(item.docId)}
                        className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-slate-800",
                            isTracked ? "text-brand-accent" : "text-slate-500 hover:text-white"
                        )}
                    >
                        {isTracked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    </button>
                    <div className="relative">
                        <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                            <button
                                onClick={() => vote(item.docId, 1)}
                                className={cn(
                                    "w-7 h-7 rounded flex items-center justify-center transition-all",
                                    currentVote === 'up' ? "bg-brand-accent text-slate-950" : "text-slate-600 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <ChevronUp size={16} strokeWidth={3} />
                            </button>
                            <button
                                onClick={() => vote(item.docId, -1)}
                                className={cn(
                                    "w-7 h-7 rounded flex items-center justify-center transition-all",
                                    currentVote === 'down' ? "bg-rose-500 text-white" : "text-slate-600 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <ChevronDown size={16} strokeWidth={3} />
                            </button>
                        </div>
                        {userPowerVotes > 0 && (
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-950 border border-amber-500/50 flex items-center justify-center shadow-lg" title={`${userPowerVotes} Power Votes available`}>
                                <Zap size={8} className="text-amber-500 fill-amber-500 animate-pulse" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => openModal('stake', item)}
                        data-tour={index === 0 ? "stake-button" : undefined}
                        className="h-8 px-4 rounded-lg premium-btn-cyan text-xs tracking-widest flex items-center gap-1.5"
                    >
                        <Zap size={12} fill="currentColor" />
                        Stake
                    </button>
                </div>
            </div>
        </div>
    );
});

export function RankingTable() {
    const parentRef = useRef();
    const navigate = useNavigate();
    const {
        items,
        vote,
        userVotes,
        openModal,
        isSyncing,
        user,
        usePowerVote,
        togglePowerVote,
        activeFilter,
        currentCategorySlug,
        formatValue,
        searchQuery,
        setSearchQuery
    } = useStore();

    const isMobile = useIsMobile();
    const { isTracked, toggleWatchlist } = useWatchlist();

    const totalScore = useMemo(() => 
        items.reduce((sum, item) => sum + Math.max(0, item.score || 0), 0) || 1
    , [items]);

    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => isMobile ? 136 : 64, 
        overscan: 10,
    });

    useEffect(() => {
        // Now handled by store polling
    }, [currentCategorySlug]);

    if (isSyncing && items.length === 0) {
        return (
            <div className="w-full border border-slate-800 rounded-3xl bg-slate-900 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-center flex-col gap-4 py-32">
                    <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                    <span className="text-[10px] font-black text-slate-500 tracking-[0.2em]">Synchronizing Oracle Data...</span>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="w-full border border-slate-800 rounded-3xl bg-slate-900 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-center flex-col gap-4 py-32 text-center px-4">
                    <Star size={32} className="text-slate-700" />
                    <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">
                        {activeFilter !== 'all' && activeFilter !== 'movers'
                            ? `No significant ${activeFilter} in this epoch yet`
                            : "No items found in this category"}
                    </span>
                </div>
            </div>
        );
    }

    if (isMobile) {
        return (
            <div className="flex flex-col gap-2 px-3 py-2 pb-safe">
                {/* Search Bar Mobile */}
                <div className="relative mb-2 shrink-0">
                    <input
                        type="text"
                        placeholder="Search markets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent/50 transition-all shadow-inner"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Star size={14} className="text-slate-600" />
                    </div>
                </div>

                {user?.powerVotes > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40 rounded-xl border border-amber-500/20 mb-1 shrink-0">
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-amber-500 fill-amber-500 animate-pulse" />
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">{user.powerVotes} P-VOTES</span>
                        </div>
                        <button
                            onClick={() => togglePowerVote()}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border",
                                usePowerVote
                                    ? "bg-amber-500 border-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                    : "bg-slate-950 border-slate-800 text-slate-500 font-bold"
                            )}
                        >
                            <span className="text-[9px] uppercase tracking-widest leading-none">{usePowerVote ? 'ACTIVE' : 'USE POWER VOTE'}</span>
                        </button>
                    </div>
                )}

                <div 
                    ref={parentRef}
                    className="flex flex-col overflow-y-auto h-[65vh] custom-scrollbar"
                    data-tour="ranking-table"
                >
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const item = items[virtualRow.index];
                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                        paddingBottom: '16px',
                                    }}
                                >
                                    <MobileItemCard 
                                        item={item} 
                                        index={virtualRow.index} 
                                        isTracked={isTracked(item.docId)}
                                        toggleWatchlist={() => toggleWatchlist(item.docId)}
                                        totalScore={totalScore}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full border border-slate-800 rounded-3xl glass-panel shadow-2xl overflow-hidden flex flex-col">
            {/* Desktop Table Header Tools */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase">Live Oracle Feed</h3>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">Real-time Ranking & Potential Worth</p>
                </div>
                
                <div className="relative w-64">
                    <input
                        type="text"
                        placeholder="Search units/symbols..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-accent/30 transition-all font-mono"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700">
                        <TrendingUp size={12} />
                    </div>
                </div>
            </div>

            {/* Desktop Table Header Names */}
            <div className="hidden md:flex items-center px-6 py-4 bg-slate-950/50 border-b border-slate-800 shrink-0">
                <div className="w-16 shrink-0 text-center font-black text-[9px] text-slate-500 tracking-widest">Rank</div>
                <div className="flex-1 font-black text-[9px] text-slate-500 tracking-widest">Oracle Context</div>
                <div className="w-28 shrink-0 text-right font-black text-[9px] text-slate-500 tracking-widest">Score</div>
                <div className="w-28 shrink-0 text-right pr-4 font-black text-[9px] text-slate-500 tracking-widest">Velocity</div>
                <div className="w-48 shrink-0 text-center font-black text-[9px] text-slate-500 tracking-widest">Operations</div>
            </div>

            {/* Power Vote Global Toggle */}
            {user?.powerVotes > 0 && (
                <div className="flex items-center justify-end px-6 py-2 bg-slate-900/80 border-b border-slate-800 gap-3 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-sm">
                        <Zap size={10} className="text-amber-500 fill-amber-500 animate-pulse" />
                        <span className="text-[9px] font-black text-amber-500 tracking-tighter uppercase">{user.powerVotes} Power Votes available</span>
                    </div>
                    <button
                        onClick={() => togglePowerVote()}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-full transition-all border",
                            usePowerVote
                                ? "bg-amber-500 border-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                : "bg-slate-950 border-slate-800 text-slate-500 font-bold hover:border-slate-600"
                        )}
                    >
                        <span className="text-[9px] uppercase tracking-widest leading-none">Use Power Vote</span>
                        <div className={cn(
                            "w-6 h-3 rounded-full relative transition-colors duration-300",
                            usePowerVote ? "bg-slate-950" : "bg-slate-800"
                        )}>
                            <div className={cn(
                                "absolute top-0.5 w-2 h-2 rounded-full bg-current transition-transform duration-300",
                                usePowerVote ? "left-[14px]" : "left-1"
                            )} />
                        </div>
                    </button>
                </div>
            )}

            {/* Virtualized Scrollable Item List */}
            <div 
                ref={parentRef}
                className="max-h-[70vh] overflow-y-auto custom-scrollbar"
                data-tour="ranking-table"
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item = items[virtualRow.index];
                        return (
                            <div
                                key={item.id}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                <RankingRow 
                                    item={item}
                                    index={virtualRow.index}
                                    currentVote={userVotes[item.docId]}
                                    isTracked={isTracked(item.docId)}
                                    totalScore={totalScore}
                                    formatValue={formatValue}
                                    activeFilter={activeFilter}
                                    vote={vote}
                                    toggleWatchlist={toggleWatchlist}
                                    openModal={openModal}
                                    navigate={navigate}
                                    userPowerVotes={user?.powerVotes}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-2 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[8px] font-black text-slate-600 tracking-widest shrink-0">
                <span>Rendering {items.length} Units (Virtualized)</span>
                <span className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    Oracle Feed Active
                </span>
            </div>
        </div>
    );
}

function MobileItemCard({ item, index, isTracked, toggleWatchlist, totalScore }) {
    const navigate = useNavigate();
    const { vote, userVotes, openModal, user, formatValue } = useStore();
    const currentVote = userVotes[item.docId];

    return (
        <div
            onClick={() => navigate(`/market/${item.docId}`)}
            className="glass-card card-hover rounded-xl border border-white/10 flex items-center gap-3 px-4 py-3 active:bg-slate-800/70 transition-all cursor-pointer mb-2"
        >
            {/* Rank badge */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 w-8">
                <span className={cn(
                    "font-black text-lg text-center",
                    index === 0 ? "text-amber-400" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-600" : "text-slate-500"
                )}>
                    {index + 1}
                </span>
                
                {/* Implied Probability (Currency) */}
                <span className="text-[8px] font-black text-slate-400 mt-0.5 uppercase tracking-tighter bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-center truncate w-full">
                    {formatValue(Math.max(0.01, (Math.max(0, item.score || 0) / totalScore)))}
                </span>
            </div>

            {/* Item info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-white text-sm truncate max-w-[85%]">{item.name}</p>
                    {item.symbol && <span className="text-[9px] text-slate-500 font-bold">{item.symbol}</span>}
                    {item.isSponsored && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-slate-400">{Math.floor(item.score || 0).toLocaleString()} pts</span>
                    <span className={cn(
                        "text-[10px] font-black tracking-wide",
                        (item.velocity || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                        {(item.velocity || 0) >= 0 ? '▲' : '▼'} {Math.abs(item.velocity || 0).toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Vote buttons — large touch targets */}
            <div className="flex flex-col gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={toggleWatchlist}
                    className={cn(
                        "min-h-[28px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors mb-1",
                        isTracked ? "text-brand-accent" : "text-slate-500 hover:text-white"
                    )}
                >
                    {isTracked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                </button>
                <div className="flex flex-col gap-1 relative">
                    <button
                        onClick={() => vote(item.docId, 1)}
                        className={cn(
                            "min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors",
                            currentVote === 'up' ? "bg-emerald-500 text-slate-950" : "bg-emerald-500/10 text-emerald-400 active:bg-emerald-500/30"
                        )}
                    >
                        <ChevronUp size={20} strokeWidth={3} />
                    </button>
                    <button
                        onClick={() => vote(item.docId, -1)}
                        className={cn(
                            "min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors",
                            currentVote === 'down' ? "bg-rose-500 text-white" : "bg-rose-500/10 text-rose-400 active:bg-rose-500/30"
                        )}
                    >
                        <ChevronDown size={20} strokeWidth={3} />
                    </button>
                    {user?.powerVotes > 0 && (
                        <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-950 border border-amber-500/50 flex items-center justify-center shadow-lg">
                            <Zap size={8} className="text-amber-500 fill-amber-500 animate-pulse" />
                        </div>
                    )}
                </div>
            </div>

            {/* Stake CTA */}
            <button
                onClick={(e) => { e.stopPropagation(); openModal('stake', item); }}
                data-tour={index === 0 ? "stake-button" : undefined}
                className="min-h-[44px] px-4 rounded-xl premium-btn-cyan text-[10px] tracking-widest flex-shrink-0 flex items-center shadow-lg"
            >
                STAKE
            </button>
        </div>
    );
}

function Sparkline({ data, color }) {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 48;
    const height = 12;

    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible shrink-0">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="opacity-50"
            />
        </svg>
    );
}
