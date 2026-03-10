import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ResponsiblePlayPage() {
    const navigate = useNavigate();

    return (
        <div className="max-w-3xl mx-auto py-12 px-6 space-y-8">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="flex items-center gap-4 border-b border-rose-500/30 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <AlertTriangle className="text-rose-500" size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Responsible Play</h1>
                    <p className="text-rose-500 text-xs font-black uppercase tracking-[0.2em] mt-1">Platform Protection</p>
                </div>
            </div>

            <div className="prose prose-invert max-w-none text-sm text-slate-400 leading-relaxed space-y-6">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-white">
                    <p className="font-bold text-rose-500 mb-2">Important Financial Notice</p>
                    <p>
                        Star Ranker involves financial stakes. You may lose your entire deposited balance. Staking on cultural zeitgeist outcomes is inherently unpredictable and volatile.
                    </p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">1. Set Limits</h2>
                    <p>
                        We strongly recommend setting strict personal spending limits before depositing fiat into your Star Ranker bankroll. Never stake more than you can afford to lose comfortably.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">2. Self-Exclusion</h2>
                    <p>
                        If you feel your participation is becoming unhealthy, you have the right to immediately self-exclude from the platform.
                    </p>
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                        <p className="font-bold text-white mb-1">To self-exclude:</p>
                        <p>Email <a href="mailto:support@starranker.io" className="text-brand-accent hover:underline">support@starranker.io</a> with the exact subject line: <strong>SUSPEND MY ACCOUNT</strong>.</p>
                        <p className="text-xs text-slate-500 mt-2">Your account will be permanently locked within 24 hours of receipt.</p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">3. External Support</h2>
                    <p>
                        If you need professional assistance with gambling or risk-related problems, free and confidential support is available:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Gambling Therapy:</strong> <a href="https://www.gamblingtherapy.org" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">www.gamblingtherapy.org</a></li>
                        <li><strong>NCPG Helpline:</strong> Check local resources for gambling addiction support networks in your jurisdiction.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">4. Underage Prohibition</h2>
                    <p className="font-bold text-rose-500">
                        Users under 18 years of age are strictly prohibited from using this platform.
                    </p>
                    <p>
                        Any accounts discovered to belong to minors will have their balances forfeited and the identity permanently banned.
                    </p>
                </section>
            </div>
        </div>
    );
}
