import React from 'react';
import { useStore } from '../../store/storeModel';
import { Mail, ShieldAlert, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

/**
 * EmailVerificationGuard
 * 
 * Protects routes that require a verified email address.
 * Renders a high-fidelity prompt if the user is authenticated but not verified.
 */
export function EmailVerificationGuard({ children }) {
    const { user, emailVerified, sendVerificationEmail, refreshUser } = useStore();
    const [isChecking, setIsChecking] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [bypassed, setBypassed] = useState(false);

    // If no user, the parent router should handle redirect to sign-in.
    // If user is verified or bypassed, proceed to content.
    if (!user || emailVerified || bypassed) {
        return children;
    }

    const handleResend = async () => {
        setIsResending(true);
        try {
            await sendVerificationEmail();
            setResent(true);
            setTimeout(() => setResent(false), 5000);
        } catch (err) {
            console.error('Failed to resend verification:', err);
        } finally {
            setIsResending(false);
        }
    };

    const handleCheckVerification = async () => {
        setIsChecking(true);
        try {
            await refreshUser();
            // Re-check state after sync
            const state = useStore.getState();
            if (state.emailVerified) {
                toast.success("Identity verified! Welcome back.");
            } else {
                toast.error("Verification not detected. Please check your inbox.");
            }
        } catch (err) {
            console.error('Failed to check verification:', err);
            toast.error("Network synchronization failed. Retry in 5s.");
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#020617]">
            <div className="w-full max-w-lg p-12 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-3xl relative overflow-hidden text-center">
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-[80px]" />

                <div className="relative z-10 space-y-8">
                    <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto shadow-2xl shadow-amber-500/10">
                        <ShieldAlert size={40} />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Identity Verification Required</h2>
                        <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] leading-relaxed max-w-sm mx-auto">
                            To maintain platform integrity, high-stakes market access and portfolio management require a verified Oracle Identity.
                        </p>
                    </div>

                    <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                        <div className="flex items-center gap-4 text-left">
                            <div className="p-3 rounded-2xl bg-slate-900 text-slate-400">
                                <Mail size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Registry</p>
                                <p className="text-sm font-bold text-white">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleCheckVerification}
                            disabled={isChecking}
                            className="w-full py-5 rounded-2xl bg-brand-accent text-slate-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3"
                        >
                            {isChecking ? <Loader2 size={18} className="animate-spin" /> : <><RefreshCw size={16} /> I have verified my link</>}
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleResend}
                                disabled={isResending || resent}
                                className={cn(
                                    "w-full py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                    resent
                                        ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                                        : "border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 hover:bg-slate-800/50"
                                )}
                            >
                                {isResending ? <Loader2 size={14} className="animate-spin" /> : resent ? "Link Resent" : "Resend Link"}
                            </button>
                            <button
                                onClick={() => {
                                    setBypassed(true);
                                    toast.success("Beta mode: Accessing without verification.");
                                }}
                                className="w-full py-3 rounded-xl border border-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all"
                            >
                                Proceed without Verif
                            </button>
                        </div>
                    </div>

                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest pt-4 italic">
                        Check your spam archive if the transmission is not detected.
                    </p>
                </div>
            </div>
        </div>
    );
}
