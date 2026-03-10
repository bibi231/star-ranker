import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export function Web3Status() {
    const [status, setStatus] = useState('checking'); // checking, detected, missing

    useEffect(() => {
        const checkWallet = async () => {
            // Check for window.ethereum (Metamask, etc.)
            if (typeof window !== 'undefined' && window.ethereum) {
                setStatus('detected');
            } else {
                setStatus('missing');
            }
        };

        checkWallet();
    }, []);

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
            status === 'detected' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" :
                status === 'missing' ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                    "bg-slate-800 border-slate-700 text-slate-500"
        )}>
            {status === 'detected' ? (
                <>
                    <CheckCircle2 size={12} />
                    Web3 Node Active
                </>
            ) : status === 'missing' ? (
                <>
                    <AlertCircle size={12} />
                    Web3 Missing
                </>
            ) : (
                <>
                    <Wallet size={12} className="animate-pulse" />
                    Scanning...
                </>
            )}
        </div>
    );
}
