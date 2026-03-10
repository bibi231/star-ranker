import React from 'react';
import { Eye, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
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
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Eye className="text-emerald-500" size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Privacy Policy</h1>
                    <p className="text-emerald-500 text-xs font-black uppercase tracking-[0.2em] mt-1">Effective: March 2026</p>
                </div>
            </div>

            <div className="prose prose-invert max-w-none text-sm text-slate-400 leading-relaxed space-y-6">
                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">1. Data Collected</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Authentication Data:</strong> Email addresses and basic Google profile information via Firebase Auth.</li>
                        <li><strong>Geo-IP Data:</strong> Request country of origin (for legal compliance filtering). This is processed in memory and not stored permanently.</li>
                        <li><strong>Platform Activity:</strong> Records of stakes, votes, and platform interactions.</li>
                        <li><strong>Payment References:</strong> Paystack transaction references to verify deposits.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">2. Data NOT Collected</h2>
                    <p>
                        We do not collect or store passport information, BVN (Bank Verification Numbers), or raw bank/credit card details. Paystack handles all sensitive payment processing directly.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">3. How We Use Data</h2>
                    <p>
                        Your data is used strictly for ensuring platform integrity, processing epoch settlements, verifying compliance (Geo-IP blocks), and sending crucial email notifications regarding your account or stakes.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">4. Third-Party Partners</h2>
                    <p>We share necessary data payloads with the following infrastructure partners:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Firebase:</strong> Authentication and identity management.</li>
                        <li><strong>Neon Postgres:</strong> Database hosting for application state.</li>
                        <li><strong>Paystack:</strong> Payment processing and identity verification.</li>
                        <li><strong>Brevo:</strong> Transactional email delivery.</li>
                        <li><strong>Sentry:</strong> Telemetry and error monitoring.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">5. Your Data Rights</h2>
                    <p>
                        You have the right to request the deletion of your account and associated personal data. To exercise this right, please contact <a href="mailto:support@starranker.io" className="text-emerald-500 hover:underline">support@starranker.io</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
