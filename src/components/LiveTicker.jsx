import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '../lib/utils';

const mockVotes = [
    { id: 1, user: "anon_42", item: "Bitcoin", direction: "up", time: "just now" },
    { id: 2, user: "sage_ox", item: "iPhone 15", direction: "down", time: "2s ago" },
    { id: 3, user: "oracle_dev", item: "Google", direction: "up", time: "5s ago" },
    { id: 4, user: "market_maker", item: "Solana", direction: "up", time: "8s ago" },
    { id: 5, user: "bgadz", item: "Star Ranker", direction: "up", time: "10s ago" },
    { id: 6, user: "ranker_bot", item: "Ethereum", direction: "down", time: "12s ago" },
];

export function LiveTicker() {
    return (
        <div className="h-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex items-center shrink-0">
            <div className="bg-brand-accent h-full px-4 flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-[0.2em] z-10 shadow-[4px_0_15px_rgba(0,0,0,0.1)]">
                <Zap size={14} fill="currentColor" />
                LIVE FEED
            </div>

            <div className="flex-1 relative overflow-hidden h-full">
                <motion.div
                    className="flex whitespace-nowrap items-center h-full gap-12 pl-12"
                    animate={{ x: [0, -1500] }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                >
                    {[...mockVotes, ...mockVotes, ...mockVotes].map((vote, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <span className="text-slate-900 dark:text-white underline decoration-brand-accent/20 underline-offset-4">{vote.user}</span>
                            <span className="opacity-50 font-medium">voted</span>
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-black",
                                vote.direction === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                                {vote.direction.toUpperCase()}
                            </span>
                            <span className="opacity-50 font-medium">on</span>
                            <span className="font-black text-slate-800 dark:text-slate-200">{vote.item}</span>
                            <span className="text-[9px] text-slate-400 font-medium ml-1">({vote.time})</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
