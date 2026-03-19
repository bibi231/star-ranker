import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, Zap, Shield, Coins, Users, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

const FAQ_SECTIONS = [
    {
        title: "Getting Started",
        icon: <Users size={18} />,
        items: [
            {
                q: "What is Star Ranker?",
                a: "Star Ranker is a real-time ranking and prediction platform where you vote on items across categories like Crypto, Tech, Sports, and more. Your votes influence rankings, and you can stake credits on your predictions to earn returns."
            },
            {
                q: "How do I create an account?",
                a: "Click 'Sign Up' and register with your email or Google account. You'll start as a Newbie tier with basic voting privileges. Verify your email to unlock full features."
            },
            {
                q: "Is Star Ranker free to use?",
                a: "Voting is completely free. Staking requires depositing credits into your account. During the beta, new users may receive bonus credits."
            },
            {
                q: "What beta invite code do I use?",
                a: "The current beta invite code is BETA2026. This gives you access to all features during the beta period."
            },
        ]
    },
    {
        title: "Voting & Rankings",
        icon: <Zap size={18} />,
        items: [
            {
                q: "How does voting work?",
                a: "Each item has an upvote and downvote button. Your vote applies a force to the item's momentum, which affects its ranking. Higher-tier Oracles have more voting influence."
            },
            {
                q: "How often do rankings update?",
                a: "Rankings are 'reified' (recalculated) every 60 seconds by the Ranking Engine. The scoring uses a Momentum-Weighted Ranking (MWR) algorithm where old votes naturally decay over time."
            },
            {
                q: "What are Power Votes?",
                a: "Power Votes are premium votes with 10x influence. They're earned through accurate predictions, high-tier status, or purchased as vote packs. Use them strategically on items you feel strongly about."
            },
        ]
    },
    {
        title: "Staking & Payouts",
        icon: <Coins size={18} />,
        items: [
            {
                q: "How does staking work?",
                a: "Choose an item, predict what rank it will be at the end of the current epoch (30-minute period), and stake credits on your prediction. If the item lands on your predicted rank, you earn a multiplied return."
            },
            {
                q: "What are the payout multipliers?",
                a: "Exact match = 5x your stake. Off by 1 position = 1.5x your stake. Any other result = 0x (you lose the stake). A 5% platform fee is applied to winnings."
            },
            {
                q: "When do stakes settle?",
                a: "Stakes settle automatically when the epoch rolls over (every 30 minutes). The Settlement Oracle compares your predicted rank against the actual rank at the snapshot."
            },
            {
                q: "Can I cancel a stake?",
                a: "No. Once a stake is placed, it cannot be cancelled. Only stake what you can afford to lose."
            },
        ]
    },
    {
        title: "Epochs & Snapshots",
        icon: <Clock size={18} />,
        items: [
            {
                q: "What is an epoch?",
                a: "An epoch is a 30-minute time period. At the end of each epoch, the system takes an immutable snapshot of all rankings, settles stakes, and starts a new epoch."
            },
            {
                q: "Do epochs store historical data?",
                a: "Yes. Every epoch creates a full snapshot of all item rankings, scores, velocities, and rank changes. These snapshots are permanently stored and can be viewed in the Epoch History page."
            },
            {
                q: "What happens during an epoch rollover?",
                a: "The system: (1) captures a ranking snapshot, (2) settles all pending stakes, (3) reifies rankings, (4) creates a new epoch. This entire process happens automatically."
            },
        ]
    },
    {
        title: "Security & Fair Play",
        icon: <Shield size={18} />,
        items: [
            {
                q: "How does Star Ranker prevent manipulation?",
                a: "The Anomalous Velocity Detection (AVD) system monitors for suspicious patterns like rapid-fire voting, new account abuse, and coordinated attacks. Suspicious activity is dampened or shadow-banned."
            },
            {
                q: "Is my data safe?",
                a: "Authentication is handled by Firebase (Google-grade security). Financial data is stored in encrypted Postgres databases. We never store passwords directly."
            },
            {
                q: "What currencies are supported for deposits?",
                a: "Currently, deposits are processed in Nigerian Naira (NGN) via Paystack and converted to platform credits at the prevailing rate."
            },
        ]
    },
];

export function BetaFAQPage() {
    return (
        <div className="min-h-screen bg-[#020617] p-8 md:p-16">
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-4 border-b border-slate-800 pb-12">
                    <div className="flex items-center gap-6">
                        <div className="p-4 rounded-3xl bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-xl shadow-brand-accent/5">
                            <HelpCircle size={48} />
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">Beta FAQ</h1>
                    </div>
                    <p className="text-slate-400 text-sm font-medium max-w-2xl">
                        Everything you need to know about the Star Ranker beta. Can't find your answer? Contact us at ops@starranker.market.
                    </p>
                </header>

                <div className="space-y-10">
                    {FAQ_SECTIONS.map((section, idx) => (
                        <div key={idx} className="space-y-4">
                            <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <span className="text-brand-accent">{section.icon}</span>
                                {section.title}
                            </h2>
                            <div className="space-y-2">
                                {section.items.map((item, i) => (
                                    <FAQAccordion key={i} question={item.q} answer={item.a} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 rounded-2xl bg-brand-accent/5 border border-brand-accent/20 flex items-start gap-4">
                    <MessageCircle size={24} className="text-brand-accent shrink-0 mt-1" />
                    <div>
                        <h3 className="text-sm font-black text-white uppercase">Still have questions?</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Email us at <a href="mailto:ops@starranker.market" className="text-brand-accent hover:underline">ops@starranker.market</a> and we'll respond within 24 hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FAQAccordion({ question, answer }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={cn(
            "rounded-2xl border transition-all",
            isOpen ? "bg-slate-900 border-brand-accent/20" : "bg-slate-900/50 border-slate-800"
        )}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 text-left"
            >
                <span className="text-sm font-black text-white pr-4">{question}</span>
                {isOpen ? <ChevronUp size={18} className="text-brand-accent shrink-0" /> : <ChevronDown size={18} className="text-slate-600 shrink-0" />}
            </button>
            {isOpen && (
                <div className="px-5 pb-5 pt-0">
                    <p className="text-sm text-slate-400 leading-relaxed">{answer}</p>
                </div>
            )}
        </div>
    );
}

export default BetaFAQPage;
