import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { RankingTable } from '../components/RankingTable';
import { LiveTicker } from '../components/LiveTicker';
import { StakeModal } from '../components/StakeModal';
import {
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Layers,
    Zap,
    Filter,
    Search,
    TrendingUp,
    ZapOff
} from 'lucide-react';
import { cn } from '../lib/utils';

export function MarketPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const {
        categories,
        currentCategorySlug,
        setCategoryItems,
        activeFilter,
        setActiveFilter,
        activeModal,
        closeModal,
        selectedItem,
        searchQuery,
        setSearchQuery
    } = useStore();

    useEffect(() => {
        const targetSlug = slug || 'crypto';
        setCategoryItems(targetSlug);
    }, [slug, setCategoryItems]);

    const activeCategory = categories.find(c => c.slug === currentCategorySlug) || categories[0];

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col pt-4">
            {/* Context Navigation */}
            <div className="px-8 mb-8">
                <div className="flex flex-wrap items-center gap-2 mb-6 p-1 bg-slate-950 border border-slate-800 rounded-2xl w-fit">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => navigate(`/category/${cat.slug}`)}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                currentCategorySlug === cat.slug
                                    ? "bg-brand-accent text-slate-950 shadow-lg shadow-brand-accent/20"
                                    : "text-slate-500 hover:text-white"
                            )}
                        >
                            {cat.title}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{activeCategory?.title}</h1>
                            <div className="px-3 py-1 rounded bg-slate-900 border border-brand-accent/20 text-[10px] font-black text-brand-accent uppercase tracking-widest">Live Oracle Feed</div>
                        </div>
                        <p className="text-xs text-slate-500 font-bold max-w-xl leading-relaxed">
                            {activeCategory?.description} Rankings are reified every 30 minutes via the Star Oracle protocol.
                        </p>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search inventory..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-[10px] font-black uppercase text-white placeholder-slate-700 transition-all focus:ring-1 focus:ring-brand-accent focus:outline-none"
                            />
                        </div>
                        <div className="flex bg-slate-950 border border-slate-800 rounded-2xl p-1 shrink-0">
                            <FilterButton
                                active={activeFilter === 'all'}
                                onClick={() => setActiveFilter('all')}
                                label="All"
                            />
                            <FilterButton
                                active={activeFilter === 'gainers'}
                                onClick={() => setActiveFilter('gainers')}
                                icon={<ArrowUpRight size={14} className="text-emerald-500" />}
                                label="Gainers"
                            />
                            <FilterButton
                                active={activeFilter === 'losers'}
                                onClick={() => setActiveFilter('losers')}
                                icon={<ArrowDownRight size={14} className="text-rose-500" />}
                                label="Losers"
                            />
                            <FilterButton
                                active={activeFilter === 'movers'}
                                onClick={() => setActiveFilter('movers')}
                                icon={<TrendingUp size={14} className="text-brand-accent" />}
                                label="Movers"
                            />
                            <FilterButton
                                active={activeFilter === 'sleepers'}
                                onClick={() => setActiveFilter('sleepers')}
                                icon={<ZapOff size={14} className="text-slate-500" />}
                                label="Sleepers"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Ranking Volume */}
            <div className="px-8 pb-20">
                <RankingTable />
            </div>

            {/* Global Features */}
            <div className="fixed bottom-0 left-0 w-full z-[100]">
                <LiveTicker />
            </div>

            <AnimatePresence>
                {activeModal === 'stake' && selectedItem && (
                    <StakeModal
                        isOpen={true}
                        onClose={closeModal}
                        itemId={selectedItem.id}
                        itemName={selectedItem.name}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function FilterButton({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                active ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-400"
            )}
        >
            {icon}
            {label}
        </button>
    );
}
