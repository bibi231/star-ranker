import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsPage() {
    const navigate = useNavigate();

    return (
        <div className="max-w-3xl mx-auto py-12 px-6 space-y-8">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                    <ShieldCheck className="text-brand-accent" size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Terms of Service</h1>
                    <p className="text-brand-accent text-xs font-black uppercase tracking-[0.2em] mt-1">Effective: March 2026</p>
                </div>
            </div>

            <div className="prose prose-invert max-w-none text-sm text-slate-400 leading-relaxed space-y-6">
                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">1. Platform Nature</h2>
                    <p>
                        Star Ranker is a cultural ranking platform. Staking represents a vote of confidence in future popularity, not a financial investment or derivative instrument. By participating, you acknowledge that you are engaging in a predictive social ranking experiment.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">2. Beta Status</h2>
                    <p>
                        The platform is currently in BETA. Balances are subject to reset without notice. There is no guarantee of withdrawal during the beta phase. Any fiat deposited is for testing internal platform mechanics.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">3. Epoch Finality</h2>
                    <p className="text-amber-500 font-bold">
                        Settlement is final upon epoch close. No reversals will be processed under any circumstances.
                    </p>
                    <p>
                        Once an epoch's timer reaches zero, the ranking engine will lock outcomes and distribute the pool. We do not retroactively alter epoch payouts due to disputes over external market logic.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">4. Platform Fee (Rake)</h2>
                    <p>
                        Star Ranker deducts a <strong>5% non-refundable platform fee</strong> from every stake placed. This is mathematically removed from the risk pool before any odds calculations or settlements are processed.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">5. Eligibility</h2>
                    <p>
                        You must be <strong>18 years of age or older</strong> to use this platform. You must not be a resident of any sanctioned jurisdiction. Your account will be immediately terminated if found in violation of these eligibility requirements.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">6. Account Termination Rights</h2>
                    <p>
                        Star Ranker reserves the right to suspend or terminate accounts suspected of API abuse, market manipulation, collusion, or violating these terms.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">7. Governing Law</h2>
                    <p>
                        These terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">Contact</h2>
                    <p>
                        Questions regarding these terms should be directed to <a href="mailto:support@starranker.io" className="text-brand-accent hover:underline">support@starranker.io</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
