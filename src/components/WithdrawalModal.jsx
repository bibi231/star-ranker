import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, X, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/storeModel';
import { apiGet, apiPost } from '../lib/api';
import { cn } from '../lib/utils';

export function WithdrawalModal({ isOpen, onClose }) {
    const { balance, formatValue, fetchUserProfile } = useStore();
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

    // Fetch banks on open
    useEffect(() => {
        if (isOpen && banks.length === 0) {
            setBanksLoading(true);
            apiGet('/api/withdrawals/banks')
                .then(data => setBanks(Array.isArray(data) ? data : []))
                .catch(() => setError('Failed to load banks'))
                .finally(() => setBanksLoading(false));
        }
    }, [isOpen]);

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

    // Auto-resolve account name when 10 digits entered
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
                // Update balance immediately
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
    const isAmountValid = numAmount >= 100 && numAmount <= balance;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className={cn(
                    "fixed z-50 bg-[#0D1B2A] border border-[#C9A84C]/30 shadow-2xl overflow-hidden",
                    "md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] md:rounded-2xl md:max-h-[85vh]",
                    "bottom-0 left-0 right-0 rounded-t-3xl max-h-[90vh]"
                )}
                onClick={e => e.stopPropagation()}
            >
                {/* Drag handle (mobile) */}
                <div className="flex justify-center pt-3 md:hidden">
                    <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">
                        {success ? '✓ Withdrawal Initiated' : 'Withdraw Funds'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>

                    {/* Success State */}
                    {success ? (
                        <div className="text-center py-8 space-y-4">
                            <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
                            <p className="text-white font-bold">Withdrawal Initiated!</p>
                            <p className="text-slate-400 text-sm">
                                ₦{numAmount.toLocaleString()} is being transferred to {accountName}.
                                Funds arrive within 24 hours.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl bg-[#C9A84C] text-[#0D1B2A] font-black text-sm uppercase tracking-widest"
                            >
                                Done
                            </button>
                        </div>
                    ) : step === 1 ? (
                        /* Step 1: Amount */
                        <div className="space-y-5">
                            <div className="text-center">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Available Balance</div>
                                <div className="text-2xl font-black text-emerald-400">{formatValue(balance)}</div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Withdrawal Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">₦</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0"
                                        min="100"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-white text-lg font-bold focus:border-[#C9A84C]/50 focus:outline-none"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>
                                {numAmount > 0 && numAmount < 100 && (
                                    <p className="text-rose-400 text-[10px] mt-1">Minimum withdrawal is ₦100</p>
                                )}
                                {numAmount > balance && (
                                    <p className="text-rose-400 text-[10px] mt-1">Exceeds available balance</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {[1000, 5000, 10000, 50000].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setAmount(String(Math.min(v, balance)))}
                                        className="flex-1 py-2 rounded-lg bg-white/5 text-[9px] font-black text-slate-400 hover:bg-[#C9A84C]/10 hover:text-[#C9A84C] transition-all"
                                    >
                                        ₦{v >= 1000 ? `${v / 1000}K` : v}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-400/80">Withdrawals are processed within 24 hours via bank transfer.</p>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!isAmountValid}
                                className={cn(
                                    "w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all min-h-[44px]",
                                    isAmountValid
                                        ? "bg-[#C9A84C] text-[#0D1B2A] hover:bg-white"
                                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
                                )}
                            >
                                Continue <ArrowRight size={16} />
                            </button>
                        </div>
                    ) : step === 2 ? (
                        /* Step 2: Bank Details */
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Select Bank</label>
                                {banksLoading ? (
                                    <div className="flex items-center gap-2 text-slate-500 text-xs py-3"><Loader2 size={14} className="animate-spin" /> Loading banks...</div>
                                ) : (
                                    <select
                                        value={selectedBank?.code || ''}
                                        onChange={e => {
                                            const bank = banks.find(b => b.code === e.target.value);
                                            setSelectedBank(bank || null);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-[#C9A84C]/50 focus:outline-none"
                                        style={{ fontSize: '16px' }}
                                    >
                                        <option value="">Choose a bank...</option>
                                        {banks.map(bank => (
                                            <option key={bank.code} value={bank.code}>{bank.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Account Number</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    placeholder="0123456789"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-[#C9A84C]/50 focus:outline-none"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>

                            {/* Account Name Resolution */}
                            {resolving && (
                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                    <Loader2 size={14} className="animate-spin" /> Resolving account...
                                </div>
                            )}
                            {accountName && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                    <span className="text-emerald-400 text-sm font-bold">{accountName}</span>
                                </div>
                            )}
                            {resolveError && (
                                <p className="text-rose-400 text-[10px]">{resolveError}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 text-slate-400 font-black text-sm uppercase tracking-widest min-h-[44px]"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!accountName}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 min-h-[44px]",
                                        accountName
                                            ? "bg-[#C9A84C] text-[#0D1B2A] hover:bg-white"
                                            : "bg-slate-800 text-slate-600 cursor-not-allowed"
                                    )}
                                >
                                    Review <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Step 3: Confirm */
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Amount</span>
                                    <span className="text-white font-black">₦{numAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Bank</span>
                                    <span className="text-white font-bold">{selectedBank?.name}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Account</span>
                                    <span className="text-white font-mono">{accountNumber}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Name</span>
                                    <span className="text-emerald-400 font-bold">{accountName}</span>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={submitting}
                                    className="flex-1 py-3 rounded-xl bg-white/5 text-slate-400 font-black text-sm uppercase tracking-widest min-h-[44px]"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 py-3 rounded-xl bg-[#C9A84C] text-[#0D1B2A] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 min-h-[44px] hover:bg-white transition-all"
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
