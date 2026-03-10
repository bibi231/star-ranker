import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Scale, Globe, AlertCircle, ChevronRight } from 'lucide-react';
import { storage } from '../utils/storage';

export function LegalModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        const isAccepted = storage.getItem('star-ranker-legal-accepted');
        if (!isAccepted) {
            setIsOpen(true);
        }
    }, []);

    const handleAccept = () => {
        storage.setItem('star-ranker-legal-accepted', 'true');
        setAccepted(true);
        setTimeout(() => setIsOpen(false), 800);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.93, y: 10 }}
                        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-brand-accent/10"
                    >
                        {/* Header */}
                        <div className="px-8 pt-10 pb-6 text-center">
                            <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-accent/20">
                                <ShieldCheck className="text-brand-accent" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">Jurisdictional Protocols</h2>
                            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest leading-relaxed">System Access Verification Required</p>
                        </div>

                        {/* Content */}
                        <div className="px-8 pb-8 space-y-4">
                            <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-5 flex gap-4">
                                <Scale className="text-slate-400 shrink-0" size={20} />
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Platform Nature</h4>
                                    <p className="text-[11px] text-slate-500 leading-normal">
                                        Star Ranker is a cultural popularity engine. All "Stakes" represent reputation units and do not constitute financial derivatives or investment products.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-5 flex gap-4">
                                <Globe className="text-slate-400 shrink-0" size={20} />
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Gated Jurisdictions</h4>
                                    <p className="text-[11px] text-slate-500 leading-normal">
                                        Staking is disabled in sanctioned regions and locations where predictive markets are restricted. You certify you are not accessing from such a region.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-5 flex gap-4">
                                <AlertCircle className="text-brand-accent shrink-0" size={20} />
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Beta Protocol</h4>
                                    <p className="text-[11px] text-brand-accent/80 leading-normal">
                                        This terminal is in active BETA. Systems are subject to reset and volatility dampening based on oracle oversight.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 pt-0">
                            <button
                                onClick={handleAccept}
                                disabled={accepted}
                                className="w-full h-14 bg-white hover:bg-brand-accent hover:text-slate-950 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 group shadow-xl shadow-brand-accent/5"
                            >
                                {accepted ? (
                                    <span className="animate-pulse">Protocol Initialized...</span>
                                ) : (
                                    <>
                                        Synchronize Agreement
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                            <p className="text-center mt-4 text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                By entering, you agree to the terms in <span className="text-slate-400">LEGAL.md</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
