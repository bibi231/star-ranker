import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Building2, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Info, ArrowUpRight } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { apiGet, apiPost } from '../lib/api';
import { cn } from '../lib/utils';
import { useIsMobile } from '../hooks/useIsMobile';

export function WithdrawalModal({ isOpen, onClose }) {
    const { user, balance, formatValue, fetchUserProfile } = useStore();
    const [step, setStep] = useState(1);
    const [amount, setAmount] = useState('');
    const [banks, setBanks] = useState([]);
    const [selectedBank, setSelectedBank] = useState(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [resolving, setResolving] = useState(false);
    const [resolveError, setResolveError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [banksLoading, setBanksLoading] = useState(false);
    const [viewportHeight, setViewportHeight] = useState('100vh');
    const isMobile = useIsMobile();

    // Visual Viewport Fix (Mobile Keyboard)
    useEffect(() => {
        if (!isMobile || !isOpen) return;
        const vv = window.visualViewport;
        if (!vv) return;
        const handler = () => setViewportHeight(`${vv.height}px`);
        vv.addEventListener('resize', handler);
        handler();
        return () => vv.removeEventListener('resize', handler);
    }, [isMobile, isOpen]);

    // Fetch banks on open
    useEffect(() => {
        if (isOpen && banks.length === 0) {
            setBanksLoading(true);
            apiGet('/api/withdrawals/banks')
                .then(data => setBanks(Array.isArray(data) ? data : []))
                .catch(() => setError('Failed to load banks'))
                .finally(() => setBanksLoading(false));
        }
    }, [isOpen, banks.length]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setAmount('');
            setSelectedBank(null);
            setAccountNumber('');
            setAccountName('');
            setResolveError('');
            setError('');
            setSuccess(false);
        }
    }, [isOpen]);

    // Auto-resolve account name
    useEffect(() => {
        if (accountNumber.length === 10 && selectedBank) {
            setResolving(true);
            setResolveError('');
            setAccountName('');
            apiPost('/api/withdrawals/resolve', {
                accountNumber,
                bankCode: selectedBank.code
            })
                .then(data => {
                    if (data?.accountName) {
                        setAccountName(data.accountName);
                    } else {
                        setResolveError('Account not found at this bank');
                    }
                })
                .catch(() => setResolveError('Account resolution failed'))
                .finally(() => setResolving(false));
        } else {
            setAccountName('');
            setResolveError('');
        }
    }, [accountNumber, selectedBank]);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        try {
            const result = await apiPost('/api/withdrawals/request', {
                amount: parseFloat(amount),
                bankCode: selectedBank.code,
                accountNumber,
                accountName
            });
            if (result?.success) {
                setSuccess(true);
                useStore.setState({ balance: result.newBalance ?? (balance - parseFloat(amount)) });
                fetchUserProfile();
            } else {
                setError(result?.error || 'Withdrawal failed');
            }
        } catch (err) {
            setError(err?.message || 'Withdrawal processing failed');
        } finally {
            setSubmitting(false);
        }
    };

    const numAmount = parseFloat(amount) || 0;
    const rate = useStore.getState().rates[useStore.getState().currency] || 1;
    const balanceLocal = balance * rate;
    const minBalanceLocal = 1.0 * rate;
    const isAmountValid = numAmount >= 100 && (balanceLocal - numAmount) >= minBalanceLocal;

    if (!isOpen) return null;

    const ModalHeader = ({ title, sub }) => (
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#C9A84C]/10 text-[#C9A84C]">
                    <Wallet size={22} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter">{title}</h2>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{sub}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full touch-target">
                <X size={18} />
            </button>
        </div>
    );

    const commonContainerClass = cn(
        "relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-y-auto mx-4",
        isMobile ? "fixed bottom-0 left-0 right-0 rounded-t-[2.5rem] max-h-[95vh] border-t border-slate-800 rounded-b-none" : "max-h-[85vh]"
    );

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                />

                <motion.div
                    initial={isMobile ? { y: '100%' } : { y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={isMobile ? { y: '100%' } : { y: 40, opacity: 0 }}
                    className={commonContainerClass}
                    style={isMobile ? { maxHeight: `calc(${viewportHeight} * 0.95)` } : {}}
                >
                    {isMobile && (
                        <div className="flex justify-center pt-3 pb-2 w-full sticky top-0 bg-slate-900 z-10 border-b border-white/5">
                            <div className="w-12 h-1.5 rounded-full bg-white/20" />
                        </div>
                    )}

                    <ModalHeader
                        title={success ? 'Confirmed' : 'Withdraw'}
                        sub={success ? 'Funds Transferred' : `Step ${step} of 3`}
                    />

                    <div className="p-6 md:p-8 space-y-6">
                        {success ? (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={32} className="text-emerald-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white italic">Withdrawal Initiated</h3>
                                <div className="space-y-2 text-sm">
                                    <p className="text-slate-400">₦{numAmount.toLocaleString()} → <span className="text-white font-bold">{accountName}</span></p>
                                    <p className="text-slate-500">Processing ETA: 24 Hours</p>
                                </div>
                                <button onClick={onClose} className="mt-4 px-8 py-3 bg-[#C9A84C] text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest min-h-[48px] w-full touch-target hover:bg-white transition-all">
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                {step === 1 && (
                                    <div className="space-y-6">
                                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Available Capital</div>
                                            <div className="text-2xl font-mono font-black text-white">{formatValue(balance)}</div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                                <ArrowUpRight size={12} className="text-amber-500" /> Redemption Amount (NGN)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg font-black">₦</span>
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={e => setAmount(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-10 pr-4 py-4 text-xl font-mono font-black text-white focus:outline-none focus:border-[#C9A84C]/50 transition-all font-bold"
                                                />
                                            </div>
                                            <div className="flex gap-2 w-full pt-1">
                                                {[1000, 5000, 10000, 50000].map(v => (
                                                    <button
                                                        key={v}
                                                        onClick={() => setAmount(String(Math.max(0, Math.floor(Math.min(v, balanceLocal - minBalanceLocal)))))}
                                                        className={cn(
                                                            "flex-1 py-1 rounded-xl text-[10px] font-black uppercase border transition-all touch-target",
                                                            parseInt(amount) === v
                                                                ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10"
                                                                : "border-white/5 text-slate-500 hover:text-white"
                                                        )}
                                                    >
                                                        ₦{v >= 1000 ? `${v / 1000}K` : v}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 text-center text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1.5 italic">
                                            <Info size={12} className="text-slate-600 shrink-0" />
                                            Redemption is permanent once confirmed.
                                        </div>

                                        {error && (
                                            <div className="flex gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                                <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-bold text-rose-400 uppercase">{error}</p>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setStep(2)}
                                            disabled={!isAmountValid}
                                            className={cn(
                                                "w-full min-h-[56px] py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mt-4",
                                                !isAmountValid
                                                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                                                    : "bg-[#00D18E] text-[#0D1B2A] active:scale-95 shadow-[0_4px_12px_rgba(0,209,142,0.2)]"
                                            )}
                                        >
                                            Next Stage <ArrowRight size={16} />
                                        </button>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">Target Institution</label>
                                            {banksLoading ? (
                                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-950 border border-white/5 text-slate-400 text-xs">
                                                    <Loader2 size={16} className="animate-spin text-brand-accent" /> Uplinking node list...
                                                </div>
                                            ) : (
                                                <select
                                                    value={selectedBank?.code || ''}
                                                    onChange={e => setSelectedBank(banks.find(b => b.code === e.target.value) || null)}
                                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-brand-accent transition-all"
                                                >
                                                    <option value="">Select target bank...</option>
                                                    {banks.map(bank => (
                                                        <option key={bank.code} value={bank.code}>{bank.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">Account Hash (Number)</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={10}
                                                value={accountNumber}
                                                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                placeholder="0123456789"
                                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-lg font-mono font-black text-white focus:outline-none focus:border-brand-accent transition-all"
                                            />
                                        </div>

                                        {resolving && (
                                            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-white/5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                                <Loader2 size={12} className="animate-spin" /> Verifying ledger identity...
                                            </div>
                                        )}
                                        {accountName && (
                                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><Building2 size={16} /></div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Oracle Identity Matched</p>
                                                    <p className="text-xs font-black text-emerald-400 uppercase tracking-tight italic">{accountName}</p>
                                                </div>
                                            </div>
                                        )}
                                        {resolveError && (
                                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest text-center">
                                                {resolveError}
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-2">
                                            <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-black text-xs uppercase tracking-widest">Back</button>
                                            <button
                                                onClick={() => setStep(3)}
                                                disabled={!accountName}
                                                className={cn(
                                                    "flex-2 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                                                    !accountName ? "bg-slate-800 text-slate-600" : "bg-[#C9A84C] text-[#0D1B2A]"
                                                )}
                                            >
                                                Audit Transfer
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-6">
                                        <div className="p-6 rounded-3xl bg-slate-950 border border-white/5 space-y-4">
                                            <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Redemption Total</span>
                                                <span className="text-lg font-mono font-black text-white italic">₦{numAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-slate-500 font-bold">NODE</span>
                                                    <span className="text-white font-mono uppercase">{selectedBank?.name}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-slate-500 font-bold">HASH</span>
                                                    <span className="text-white font-mono">{accountNumber}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-slate-500 font-bold">RECIPIENT</span>
                                                    <span className="text-emerald-400 font-black italic">{accountName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[9px] text-amber-300/60 leading-relaxed font-bold uppercase">Critical: Verify account details. Incorrect hash inputs result in permanent capital loss. Transmission takes 24h.</p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button onClick={() => setStep(2)} disabled={submitting} className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-black text-xs uppercase tracking-widest">Back</button>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={submitting}
                                                className="flex-2 px-10 py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                            >
                                                {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Execute Transfer'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
