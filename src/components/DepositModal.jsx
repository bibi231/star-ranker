import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, ArrowUpRight, AlertTriangle, Info, CreditCard } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { apiPost, apiGet } from '../lib/api';
import { cn } from '../lib/utils';
import { useIsMobile } from '../hooks/useIsMobile';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
const MIN_AMOUNT_NGN = 1000;

export function DepositModal({ isOpen, onClose }) {
    const { user, balance, formatValue, setBalance } = useStore();
    const [amountNGN, setAmountNGN] = useState('5000');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);
    const [viewportHeight, setViewportHeight] = useState('100vh');
    const isMobile = useIsMobile();

    // iOS Safari keyboard fix
    useEffect(() => {
        if (!isMobile || !isOpen) return;
        const vv = window.visualViewport;
        if (!vv) return;

        const handler = () => setViewportHeight(`${vv.height}px`);
        vv.addEventListener('resize', handler);
        handler(); // init

        return () => vv.removeEventListener('resize', handler);
    }, [isMobile, isOpen]);

    // Scroll Lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (isMobile) {
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
            }
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, [isOpen, isMobile]);

    // Auto-verify on return from Paystack (check URL for reference)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('reference');
        if (ref && isOpen) {
            verifyPayment(ref);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [isOpen]);

    const handleReset = () => {
        setSuccess(null);
        setError('');
        setAmountNGN('5000');
    };

    const verifyPayment = async (reference) => {
        setIsProcessing(true);
        setError('');
        try {
            const data = await apiGet(`/api/payments/verify/${reference}`);
            if (data.credited) {
                setSuccess({
                    amountNGN: data.amountNGN,
                    credits: data.platformCredits,
                    newBalance: data.newBalance,
                });
                setBalance(data.newBalance);
            }
        } catch (err) {
            setError(err.message || 'Verification failed');
        }
        setIsProcessing(false);
    };

    const handleDeposit = async () => {
        const amount = parseInt(amountNGN);
        if (isNaN(amount) || amount < MIN_AMOUNT_NGN) {
            setError(`Minimum deposit is ₦${MIN_AMOUNT_NGN.toLocaleString()}`);
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const data = await apiPost('/api/payments/initialize', {
                amount: amount * 100, // Convert to kobo
                email: user?.email || 'user@starranker.io',
                callbackUrl: window.location.href,
            });

            if (data.authorization_url) {
                window.location.href = data.authorization_url;
            } else {
                setError('Failed to get payment URL');
            }
        } catch (err) {
            setError(err.message || 'Payment initialization failed');
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const usdEquivalent = (parseInt(amountNGN) || 0) / 1500;

    return (
        <AnimatePresence>
            {isOpen && (
                isMobile ? (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-[101] bg-[#0D1B2A] rounded-t-[2.5rem] border-t border-[#C9A84C]/30 overflow-y-auto"
                            style={{
                                height: 'auto',
                                maxHeight: `calc(${viewportHeight} * 0.95)`,
                                paddingBottom: 'calc(var(--safe-bottom) + 16px)'
                            }}
                        >
                            <div className="flex justify-center pt-3 pb-2 w-full sticky top-0 bg-[#0D1B2A] z-10 border-b border-white/5">
                                <div className="w-12 h-1.5 rounded-full bg-white/20" />
                            </div>
                            <div className="px-6 pt-4 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="text-[#C9A84C]">
                                        <Wallet size={24} />
                                    </div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Deposit</h2>
                                </div>
                                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-full touch-target">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 md:p-8 space-y-6">
                                {success ? (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                                            <ArrowUpRight size={32} className="text-emerald-500" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white">Deposit Confirmed</h3>
                                        <div className="space-y-2 text-sm">
                                            <p className="text-slate-400">₦{success.amountNGN?.toLocaleString()} → <span className="text-emerald-400 font-bold">${success.credits?.toFixed(2)}</span> credited</p>
                                            <p className="text-slate-500">New Balance: <span className="text-white font-bold">{formatValue(success.newBalance)}</span></p>
                                        </div>
                                        <button onClick={handleReset} className="mt-4 px-8 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest min-h-[48px] w-full md:w-auto touch-target">
                                            Done
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 rounded-2xl bg-slate-950 border border-white/5">
                                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Balance</div>
                                            <div className="text-2xl font-mono font-black text-white">{formatValue(balance)}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                                <CreditCard size={12} className="text-emerald-500" /> Deposit Amount (NGN)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg font-black">₦</span>
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    value={amountNGN}
                                                    onChange={(e) => { setAmountNGN(e.target.value); setError(''); }}
                                                    placeholder="5000"
                                                    min={MIN_AMOUNT_NGN}
                                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-10 pr-4 py-4 text-xl font-mono font-black text-white focus:outline-none focus:border-emerald-500/50 transition-all touch-target"
                                                />
                                            </div>
                                            <div className="flex gap-2 w-full pt-1">
                                                {[1000, 2500, 5000, 10000].map(v => (
                                                    <button
                                                        key={v}
                                                        onClick={() => setAmountNGN(String(v))}
                                                        className={cn(
                                                            "flex-1 py-1 rounded-xl text-[10px] font-black uppercase border transition-all touch-target",
                                                            parseInt(amountNGN) === v
                                                                ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10"
                                                                : "border-white/5 text-slate-500 hover:text-white"
                                                        )}
                                                    >
                                                        ₦{v >= 1000 ? `${v / 1000}K` : v}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="pt-2 text-center text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1.5">
                                            <Info size={12} className="text-slate-600 shrink-0" />
                                            Est. Yield: ≈ <span className="text-emerald-400">${usdEquivalent.toFixed(2)} USD</span>
                                        </div>
                                        {error && (
                                            <div className="flex gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                                <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-bold text-rose-400 uppercase">{error}</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleDeposit}
                                            disabled={isProcessing || !amountNGN || parseInt(amountNGN) < MIN_AMOUNT_NGN}
                                            className={cn(
                                                "w-full min-h-[56px] py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mt-4",
                                                isProcessing || parseInt(amountNGN) < MIN_AMOUNT_NGN
                                                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                                    : "bg-[#C9A84C] text-[#0D1B2A] active:scale-95 shadow-[0_4px_12px_rgba(201,168,76,0.2)]"
                                            )}
                                        >
                                            {isProcessing ? (
                                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                                    <Wallet size={18} />
                                                </motion.div>
                                            ) : (
                                                <>Fund Wallet</>
                                            )}
                                        </button>
                                        {!PAYSTACK_PUBLIC_KEY && (
                                            <div className="flex gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                                                <p className="text-[9px] font-bold text-amber-400 uppercase">Beta mode — Paystack key not configured. Deposits will fail until PAYSTACK_SECRET_KEY is set in .env</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                ) : (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 40, opacity: 0 }}
                            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[85vh] mx-4"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                                        <Wallet size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white uppercase tracking-tighter">Fund Wallet</h2>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Paystack Deposit</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full touch-target">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 md:p-8 space-y-6">
                                {success ? (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                                            <ArrowUpRight size={32} className="text-emerald-500" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white">Deposit Confirmed</h3>
                                        <div className="space-y-2 text-sm">
                                            <p className="text-slate-400">₦{success.amountNGN?.toLocaleString()} → <span className="text-emerald-400 font-bold">${success.credits?.toFixed(2)}</span> credited</p>
                                            <p className="text-slate-500">New Balance: <span className="text-white font-bold">{formatValue(success.newBalance)}</span></p>
                                        </div>
                                        <button onClick={handleReset} className="mt-4 px-8 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest min-h-[48px] w-full md:w-auto touch-target">
                                            Done
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 rounded-2xl bg-slate-950 border border-white/5">
                                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Balance</div>
                                            <div className="text-2xl font-mono font-black text-white">{formatValue(balance)}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                                <CreditCard size={12} className="text-emerald-500" /> Deposit Amount (NGN)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg font-black">₦</span>
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    value={amountNGN}
                                                    onChange={(e) => { setAmountNGN(e.target.value); setError(''); }}
                                                    placeholder="5000"
                                                    min={MIN_AMOUNT_NGN}
                                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-10 pr-4 py-4 text-xl font-mono font-black text-white focus:outline-none focus:border-emerald-500/50 transition-all touch-target"
                                                />
                                            </div>
                                            <div className="flex gap-2 w-full pt-1">
                                                {[1000, 2500, 5000, 10000].map(v => (
                                                    <button
                                                        key={v}
                                                        onClick={() => setAmountNGN(String(v))}
                                                        className={cn(
                                                            "flex-1 py-1 rounded-xl text-[10px] font-black uppercase border transition-all touch-target",
                                                            parseInt(amountNGN) === v
                                                                ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10"
                                                                : "border-white/5 text-slate-500 hover:text-white"
                                                        )}
                                                    >
                                                        ₦{v >= 1000 ? `${v / 1000}K` : v}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="pt-2 text-center text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1.5">
                                            <Info size={12} className="text-slate-600 shrink-0" />
                                            Est. Yield: ≈ <span className="text-emerald-400">${usdEquivalent.toFixed(2)} USD</span>
                                        </div>
                                        {error && (
                                            <div className="flex gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                                <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-bold text-rose-400 uppercase">{error}</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleDeposit}
                                            disabled={isProcessing || !amountNGN || parseInt(amountNGN) < MIN_AMOUNT_NGN}
                                            className={cn(
                                                "w-full min-h-[56px] py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mt-4",
                                                isProcessing || parseInt(amountNGN) < MIN_AMOUNT_NGN
                                                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                                    : "bg-[#C9A84C] text-[#0D1B2A] active:scale-95 shadow-[0_4px_12px_rgba(201,168,76,0.2)]"
                                            )}
                                        >
                                            {isProcessing ? (
                                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                                    <Wallet size={18} />
                                                </motion.div>
                                            ) : (
                                                <>Fund Wallet</>
                                            )}
                                        </button>
                                        {!PAYSTACK_PUBLIC_KEY && (
                                            <div className="flex gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                                                <p className="text-[9px] font-bold text-amber-400 uppercase">Beta mode — Paystack key not configured. Deposits will fail until PAYSTACK_SECRET_KEY is set in .env</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )
            )}
        </AnimatePresence>
    );
}
