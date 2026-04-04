import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, Zap, Award, Clock, ChevronDown, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';

const EVENT_ICONS = {
    vote: Zap,
    stake: TrendingUp,
    settlement: Award,
    epoch_roll: Clock,
    exit: AlertTriangle,
    deposit: TrendingUp,
};

const EVENT_COLORS = {
    vote: 'text-brand-accent',
    stake: 'text-amber-400',
    settlement: 'text-emerald-400',
    epoch_roll: 'text-violet-400',
    exit: 'text-rose-400',
    deposit: 'text-green-400',
};

function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function maskUserId(id) {
    if (!id) return 'Anonymous';
    return `Oracle...${id.slice(-4)}`;
}

/**
 * Live Activity Feed — shows recent platform-wide market events.
 * Polls /api/activity every 30 seconds for fresh data.
 * 
 * @param {number} limit - Max events to show
 * @param {boolean} compact - Compact mode (used in sidebars)
 */
export function ActivityFeed({ limit = 15, compact = false, className }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(!compact);
    const apiGet = useStore(s => s.apiGet);
    const pollRef = useRef(null);

    const fetchActivity = useCallback(async () => {
        try {
            const data = await apiGet(`/api/activity?limit=${limit}`);
            if (Array.isArray(data)) {
                setEvents(data);
            }
        } catch (err) {
            console.warn('[ActivityFeed] Fetch failed:', err.message);
        } finally {
            setLoading(false);
        }
    }, [apiGet, limit]);

    useEffect(() => {
        fetchActivity();
        // Poll every 30 seconds
        pollRef.current = setInterval(fetchActivity, 30000);
        return () => clearInterval(pollRef.current);
    }, [fetchActivity]);

    if (compact && !expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl",
                    "bg-white/5 border border-white/10 hover:border-brand-accent/30 transition-all",
                    className
                )}
            >
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-brand-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Feed</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <ChevronDown size={12} className="text-slate-500" />
                </div>
            </button>
        );
    }

    return (
        <div className={cn("glass-panel rounded-2xl overflow-hidden", className)}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <Activity size={14} className="text-brand-accent" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Live Activity
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-mono text-slate-600">{events.length} events</span>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-4 h-4 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 text-[10px] font-mono uppercase tracking-widest">
                        No activity yet
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {events.map((event, i) => {
                            const Icon = EVENT_ICONS[event.type] || Activity;
                            const color = EVENT_COLORS[event.type] || 'text-slate-400';

                            return (
                                <motion.div
                                    key={event.id || i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="flex items-start gap-3 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                                >
                                    <div className={cn("mt-0.5 p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors", color)}>
                                        <Icon size={12} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-slate-300 leading-relaxed truncate">
                                            {event.description || `${event.type} event`}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[8px] font-mono text-slate-600">
                                                {maskUserId(event.userId)}
                                            </span>
                                            {event.amount > 0 && (
                                                <span className="text-[8px] font-mono text-amber-400/60">
                                                    ₦{event.amount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-mono text-slate-600 shrink-0 mt-0.5">
                                        {event.createdAt ? timeAgo(event.createdAt) : ''}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

export default ActivityFeed;
