import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Link2, Copy, Check, Loader2 } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { cn } from '../lib/utils';

/**
 * Explains that Fund/Withdraw flows are fiat (NGN); shows linked Web3 wallet for identity.
 */
export function WalletFundingContext({ className }) {
    const { address, isConnected } = useAccount();
    const { user, bindWallet } = useStore();
    const [copied, setCopied] = useState(false);
    const [linking, setLinking] = useState(false);

    const linked = user?.walletAddress;
    const showBrowser = isConnected && address;
    const needsRelink = Boolean(
        linked && address && linked.toLowerCase() !== address.toLowerCase()
    );

    const copyAddr = async (addr) => {
        if (!addr) return;
        try {
            await navigator.clipboard.writeText(addr);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };

    const handleLink = async () => {
        if (!address) return;
        setLinking(true);
        try {
            await bindWallet(address);
        } catch {
            /* bindWallet may toast elsewhere */
        } finally {
            setLinking(false);
        }
    };

    return (
        <div
            className={cn(
                'p-4 rounded-2xl border border-white/10 bg-slate-950/80 space-y-3',
                className
            )}
        >
            <div className="flex items-start gap-2">
                <Link2 size={14} className="text-[#C9A84C] shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed">
                    Deposits and withdrawals use <span className="text-slate-400">Naira (NGN)</span> — Paystack for funding and bank transfer for cash-out. Your{' '}
                    <span className="text-slate-400">connected wallet</span> is your on-chain identity on Star Ranker.
                </p>
            </div>

            {linked && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <div className="min-w-0">
                        <div className="text-[8px] font-black text-emerald-500/90 uppercase tracking-widest mb-0.5">
                            Linked wallet
                        </div>
                        <p className="font-mono text-[11px] text-white truncate">
                            {linked.slice(0, 10)}…{linked.slice(-8)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => copyAddr(linked)}
                        className="shrink-0 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors touch-target"
                        title="Copy full address"
                    >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                </div>
            )}

            {showBrowser && !linked && user && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <div className="min-w-0">
                        <div className="text-[8px] font-black text-amber-500/90 uppercase tracking-widest mb-0.5">
                            Browser wallet (not linked yet)
                        </div>
                        <p className="font-mono text-[11px] text-[#C9A84C] truncate">{address}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleLink}
                        disabled={linking}
                        className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                    >
                        {linking ? <Loader2 size={12} className="animate-spin" /> : null}
                        Link to account
                    </button>
                </div>
            )}

            {needsRelink && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[9px] font-bold text-amber-200/90 uppercase tracking-wide">
                    Your browser wallet differs from the one saved on your account. Use Settings → Capital Control or tap Link to update.
                    <button
                        type="button"
                        onClick={handleLink}
                        disabled={linking}
                        className="block mt-2 text-[#C9A84C] underline-offset-2 hover:underline"
                    >
                        {linking ? 'Updating…' : 'Save current wallet to account'}
                    </button>
                </div>
            )}

            {!user && (
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                    Sign in to link a wallet to your profile.
                </p>
            )}
        </div>
    );
}
