/**
 * GlobalSearch — ⌘K-style global search overlay
 * Polymarket-inspired: items, oracles, categories grouped, debounced
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Hash, User, X, ArrowRight, Loader2, TrendingUp } from 'lucide-react';
import { apiGet } from '../lib/api';
import ItemImage from './ItemImage';

export default function GlobalSearch({ open, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ items: [], users: [], categories: [] });
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Focus + fetch trending when opened
    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults({ items: [], users: [], categories: [] });
            setActiveIdx(0);
            return;
        }
        const t = setTimeout(() => inputRef.current?.focus(), 30);
        apiGet('/api/search/trending').then((data) => {
            if (Array.isArray(data)) setTrending(data.slice(0, 8));
        }).catch(() => {});
        return () => clearTimeout(t);
    }, [open]);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) return;
        const timeout = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await apiGet(`/api/search?q=${encodeURIComponent(query)}`);
                setResults({
                    items: Array.isArray(data?.items) ? data.items : [],
                    users: Array.isArray(data?.users) ? data.users : [],
                    categories: Array.isArray(data?.categories) ? data.categories : [],
                });
            } catch (err) {
                console.error('[GlobalSearch]', err);
            } finally {
                setLoading(false);
            }
        }, 250);
        return () => clearTimeout(timeout);
    }, [query]);

    if (!open) return null;

    const flatList = [
        ...(query ? results.items : trending).map((x) => ({ kind: 'item', id: x.id || x.docId, ...x })),
        ...results.users.map((x) => ({ kind: 'user', id: x.id, ...x })),
        ...results.categories.map((x) => ({ kind: 'category', id: x.id || x.slug, ...x })),
    ];

    const go = (entry) => {
        if (!entry) return;
        if (entry.kind === 'item') navigate(`/market/${entry.docId || entry.id}`);
        else if (entry.kind === 'user') navigate(`/profile/${entry.oracleHandle || entry.username}`);
        else if (entry.kind === 'category') navigate(`/category/${entry.slug}`);
        onClose?.();
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape') return onClose?.();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, Math.max(0, flatList.length - 1)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            go(flatList[activeIdx]);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-2xl bg-[#0D1B2A] rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                    <Search size={18} className="text-amber-400" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
                        onKeyDown={onKeyDown}
                        placeholder="Search markets, oracles, categories…"
                        aria-label="Search"
                        className="flex-1 bg-transparent text-white placeholder-gray-500 text-base outline-none"
                    />
                    {loading && <Loader2 size={16} className="animate-spin text-amber-400" />}
                    <button
                        onClick={onClose}
                        className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-white/5"
                        aria-label="Close search"
                    >
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {/* Trending when no query */}
                    {!query && trending.length > 0 && (
                        <Section title="Trending" icon={<TrendingUp size={12} />}>
                            {trending.map((item, i) => (
                                <Row
                                    key={item.id || item.docId}
                                    active={activeIdx === i}
                                    onClick={() => go({ kind: 'item', ...item })}
                                >
                                    <ItemImage src={item.imageUrl} name={item.name} size={32} rounded="rounded-lg" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm truncate">{item.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.categorySlug || item.category}</p>
                                    </div>
                                    <span className="text-amber-400 font-black text-xs">#{item.rank}</span>
                                    <ArrowRight size={14} className="text-slate-600" />
                                </Row>
                            ))}
                        </Section>
                    )}

                    {/* Item results */}
                    {query && results.items.length > 0 && (
                        <Section title="Markets" icon={<Hash size={12} />}>
                            {results.items.map((item, i) => (
                                <Row
                                    key={item.id || item.docId}
                                    active={activeIdx === i}
                                    onClick={() => go({ kind: 'item', ...item })}
                                >
                                    <ItemImage src={item.imageUrl} name={item.name} size={32} rounded="rounded-lg" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm truncate">{item.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.categorySlug || item.category}</p>
                                    </div>
                                    <span className="text-amber-400 font-black text-xs">#{item.rank}</span>
                                </Row>
                            ))}
                        </Section>
                    )}

                    {/* User / Oracle results */}
                    {query && results.users.length > 0 && (
                        <Section title="Oracles" icon={<User size={12} />}>
                            {results.users.map((u, i) => {
                                const idx = results.items.length + i;
                                return (
                                    <Row
                                        key={u.id}
                                        active={activeIdx === idx}
                                        onClick={() => go({ kind: 'user', ...u })}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                                            <User size={14} className="text-amber-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm truncate">@{u.oracleHandle || u.username}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{u.tier || 'Bronze'}</p>
                                        </div>
                                        <span className="text-emerald-400 font-black text-xs">{u.reputation || 0} REP</span>
                                    </Row>
                                );
                            })}
                        </Section>
                    )}

                    {/* Category results */}
                    {query && results.categories.length > 0 && (
                        <Section title="Categories" icon={<Hash size={12} />}>
                            {results.categories.map((c, i) => {
                                const idx = results.items.length + results.users.length + i;
                                return (
                                    <Row
                                        key={c.id || c.slug}
                                        active={activeIdx === idx}
                                        onClick={() => go({ kind: 'category', ...c })}
                                    >
                                        <Hash size={14} className="text-amber-400 shrink-0" />
                                        <p className="flex-1 text-white text-sm">{c.title || c.name}</p>
                                    </Row>
                                );
                            })}
                        </Section>
                    )}

                    {query && !loading && flatList.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-12">No results for &ldquo;{query}&rdquo;</p>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500">
                    <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate</span>
                    <span><Kbd>↵</Kbd> open</span>
                    <span><Kbd>esc</Kbd> close</span>
                </div>
            </div>
        </div>
    );
}

function Section({ title, icon, children }) {
    return (
        <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                {icon} {title}
            </div>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

function Row({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors ${
                active ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-white/5 border border-transparent'
            }`}
        >
            {children}
        </button>
    );
}

function Kbd({ children }) {
    return <kbd className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-bold mr-1">{children}</kbd>;
}
