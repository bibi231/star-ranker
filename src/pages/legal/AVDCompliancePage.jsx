import React from 'react';
import { Shield, Eye, Zap, AlertTriangle, ShieldCheck, Activity, Lock, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AVDCompliancePage() {
    return (
        <div className="min-h-screen bg-[#020617] p-8 md:p-16">
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-4 border-b border-slate-800 pb-12">
                    <div className="flex items-center gap-6">
                        <div className="p-4 rounded-3xl bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-xl shadow-brand-accent/5">
                            <Shield size={48} />
                        </div>
                        <div>
                            <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">AVD Compliance</h1>
                            <p className="text-brand-accent text-[10px] font-black uppercase tracking-widest mt-2">Anomalous Velocity Detection Protocol</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm font-medium max-w-2xl">
                        Star Ranker employs a multi-layered anti-manipulation system to ensure market integrity.
                        This document outlines the detection rules, enforcement actions, and compliance standards.
                    </p>
                </header>

                {/* What is AVD */}
                <section className="space-y-4">
                    <SectionTitle icon={<Eye size={20} />} title="What is AVD?" />
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                        <p className="text-slate-400 text-sm leading-relaxed">
                            <strong className="text-white">Anomalous Velocity Detection (AVD)</strong> is Star Ranker's proprietary anti-manipulation engine.
                            It monitors voting patterns, account behavior, and network signals in real-time to detect and neutralize attempts
                            to artificially influence rankings.
                        </p>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            AVD operates transparently — all rules are published here so users understand what behaviors trigger enforcement actions.
                        </p>
                    </div>
                </section>

                {/* Detection Rules */}
                <section className="space-y-4">
                    <SectionTitle icon={<Activity size={20} />} title="Detection Rules" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RuleCard
                            trigger="Rate Abuse"
                            condition="> 20 votes/hour on a single item"
                            action="50% vote dampening"
                            severity="medium"
                        />
                        <RuleCard
                            trigger="New Account Abuse"
                            condition="Account age < 7 days"
                            action="30% vote dampening"
                            severity="low"
                        />
                        <RuleCard
                            trigger="Unverified Account"
                            condition="No social provider linked"
                            action="50% vote dampening"
                            severity="medium"
                        />
                        <RuleCard
                            trigger="Volume Flooding"
                            condition="> 50 votes/day per user"
                            action="90% vote dampening"
                            severity="high"
                        />
                        <RuleCard
                            trigger="IP Clustering"
                            condition="> 5 votes from same IP in 10 min"
                            action="60% vote dampening"
                            severity="high"
                        />
                        <RuleCard
                            trigger="Confidence Collapse"
                            condition="Confidence score < 0.2"
                            action="Shadow ban (0% effect)"
                            severity="critical"
                        />
                    </div>
                </section>

                {/* Enforcement Levels */}
                <section className="space-y-4">
                    <SectionTitle icon={<Lock size={20} />} title="Enforcement Levels" />
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="space-y-4">
                            <EnforcementLevel
                                level="Level 1 — Dampening"
                                desc="Vote influence is reduced by a percentage. The user can still vote but with diminished effect. Automatic and reversible."
                                color="text-amber-400"
                            />
                            <EnforcementLevel
                                level="Level 2 — Shadow Ban"
                                desc="Votes are accepted but have zero effect on rankings. The user sees normal UI behavior. Reversible after review."
                                color="text-orange-400"
                            />
                            <EnforcementLevel
                                level="Level 3 — Account Suspension"
                                desc="All voting and staking privileges revoked. Balance frozen pending investigation. Requires admin review to lift."
                                color="text-rose-400"
                            />
                            <EnforcementLevel
                                level="Level 4 — Permanent Ban"
                                desc="Account permanently disabled. Applied only for confirmed malicious activity or Terms of Service violations."
                                color="text-rose-600"
                            />
                        </div>
                    </div>
                </section>

                {/* User Rights */}
                <section className="space-y-4">
                    <SectionTitle icon={<Users size={20} />} title="User Rights" />
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                        <p className="text-slate-400 text-sm leading-relaxed">
                            If you believe your account has been incorrectly flagged by AVD:
                        </p>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li className="flex items-start gap-2">
                                <ShieldCheck size={14} className="text-brand-accent mt-1 shrink-0" />
                                <span>Contact <a href="mailto:ops@starranker.market" className="text-brand-accent hover:underline">ops@starranker.market</a> with your account email and a description of the issue.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ShieldCheck size={14} className="text-brand-accent mt-1 shrink-0" />
                                <span>All enforcement actions (except Level 1 dampening) are reviewed by a human admin within 48 hours.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <ShieldCheck size={14} className="text-brand-accent mt-1 shrink-0" />
                                <span>Frozen balances are returned in full if an enforcement action is reversed.</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Disclaimer */}
                <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20">
                    <p className="text-rose-400 text-xs font-bold flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        Star Ranker reserves the right to update AVD rules at any time. Continued use of the platform constitutes acceptance of the current enforcement policy.
                    </p>
                </div>
            </div>
        </div>
    );
}

function SectionTitle({ icon, title }) {
    return (
        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="text-brand-accent">{icon}</span> {title}
        </h2>
    );
}

function RuleCard({ trigger, condition, action, severity }) {
    const severityColors = {
        low: "border-emerald-500/20 bg-emerald-500/5",
        medium: "border-amber-500/20 bg-amber-500/5",
        high: "border-orange-500/20 bg-orange-500/5",
        critical: "border-rose-500/20 bg-rose-500/5",
    };
    const badgeColors = {
        low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
        critical: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    };

    return (
        <div className={cn("p-4 rounded-2xl border space-y-3", severityColors[severity])}>
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white uppercase">{trigger}</h4>
                <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded border", badgeColors[severity])}>
                    {severity}
                </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Condition: <span className="text-slate-300">{condition}</span></p>
            <p className="text-[11px] text-amber-500 font-black uppercase">→ {action}</p>
        </div>
    );
}

function EnforcementLevel({ level, desc, color }) {
    return (
        <div className="flex gap-4 items-start">
            <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", color.replace("text-", "bg-"))} />
            <div>
                <h4 className={cn("text-sm font-black uppercase", color)}>{level}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

export default AVDCompliancePage;
