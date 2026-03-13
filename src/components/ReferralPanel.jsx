import React, { useState } from 'react';
import { useStore } from '../store/storeModel';
import { Share2, Copy, CheckCircle, TrendingUp } from 'lucide-react';

export function ReferralPanel() {
    const { user } = useStore();
    const [copied, setCopied] = useState(false);

    if (!user) return null;

    const referralLink = `${window.location.origin}/signup?ref=${user.referralCode || ''}`;

    const handleCopy = () => {
        if (!user.referralCode) return;
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                    <Share2 size={18} />
                </div>
                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Oracle Network</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Referral Protocol</p>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase tracking-widest">
                    Recruit new Oracles. Earn 1% of their deployment capital for life.
                </p>

                <div className="flex gap-2 items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="flex-1 font-mono text-xs text-brand-accent truncate select-all">
                        {user.referralCode ? referralLink : 'Generating...'}
                    </div>
                    <button
                        onClick={handleCopy}
                        disabled={!user.referralCode}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
                    >
                        {copied ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-emerald-400">
                    <TrendingUp size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Lifetime Yield</span>
                </div>
                <div className="font-mono text-lg font-black text-white">
                    ${(user.referralEarnings || 0).toLocaleString()}
                </div>
            </div>
        </div>
    );
}
