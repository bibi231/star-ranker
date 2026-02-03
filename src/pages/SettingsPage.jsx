import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
    User,
    Lock,
    Bell,
    Shield,
    Wallet,
    Eye,
    Trash2,
    ChevronRight,
    Fingerprint,
    AppWindow,
    Globe
} from 'lucide-react';
import { cn } from '../lib/utils';

export function SettingsPage() {
    const { user, tier } = useStore();
    const [activeSection, setActiveSection] = useState('account');

    const sections = [
        { id: 'account', label: 'Identity & Profile', icon: <User size={16} /> },
        { id: 'security', label: 'Security & Access', icon: <Lock size={16} /> },
        { id: 'notifications', label: 'Alert Protocols', icon: <Bell size={16} /> },
        { id: 'wallet', label: 'Capital Control', icon: <Wallet size={16} /> },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-12 bg-[#020617] min-h-screen">
            <header className="space-y-2 border-b border-slate-800 pb-8">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">System Configuration</h1>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Adjust Oracle parameters and security layers.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                {/* Sidebar Nav */}
                <nav className="space-y-2 lg:col-span-1">
                    {sections.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={cn(
                                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest group",
                                activeSection === s.id
                                    ? "bg-brand-accent text-slate-950 shadow-lg shadow-brand-accent/20"
                                    : "text-slate-500 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800"
                            )}
                        >
                            <span className={cn("shrink-0", activeSection === s.id ? "text-slate-950" : "text-slate-600 group-hover:text-brand-accent")}>{s.icon}</span>
                            {s.label}
                        </button>
                    ))}
                    <div className="pt-8 opacity-50">
                        <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-all">
                            <Trash2 size={16} /> Danger Zone
                        </button>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="lg:col-span-3 space-y-8">
                    {activeSection === 'account' && <AccountSettings user={user} tier={tier} />}
                    {activeSection === 'security' && <SecuritySettings />}
                    {activeSection === 'notifications' && <NotificationSettings />}
                    {activeSection === 'wallet' && <WalletSettings />}
                </main>
            </div>
        </div>
    );
}

function AccountSettings({ user, tier }) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SectionHeader title="Identity & Profile" desc="Public oracle identity and credential tracking." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup label="Oracle Handle" value={user?.username} />
                <InputGroup label="Registry Email" value={user?.email} disabled />
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Registry Bio</label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all h-32"
                        placeholder="Define your analytic focus..."
                    />
                </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-black text-white uppercase mb-1">Oracle Tier Status</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{tier} Tier • No restrictions applied.</p>
                </div>
                <button className="px-4 py-2 rounded-xl bg-slate-800 text-[10px] font-black uppercase text-slate-300 hover:text-white transition-all">Request Promotion</button>
            </div>
        </div>
    );
}

function SecuritySettings() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SectionHeader title="Security Controls" desc="Fortify your account against unauthorized influence." />

            <ToggleOption
                icon={<Fingerprint size={18} />}
                title="Two-Factor Authentication"
                desc="Enforce TOTP validation on sign-in and capital deployment."
                active={false}
            />
            <ToggleOption
                icon={<Eye size={18} />}
                title="Privacy Mode"
                desc="Obfuscate your active stakes on public leaderboards."
                active={true}
            />

            <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">Active Sessions</h4>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500"><AppWindow size={16} /></div>
                        <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-tight">Vite Terminal • Windows 11</p>
                            <p className="text-[9px] text-emerald-500 font-bold uppercase">Current Session</p>
                        </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-700">192.168.1.1</span>
                </div>
            </div>
        </div>
    );
}

function NotificationSettings() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SectionHeader title="Alert Protocols" icon={<Bell size={18} />} desc="Configure real-time sync with market epochs." />
            <div className="space-y-4">
                <ToggleOption title="Market Reification" desc="Alert when a market you staked on settles." active={true} />
                <ToggleOption title="Oracle Influence" desc="Alert when your rank is contested by a higher tier." active={true} />
                <ToggleOption title="Bankroll Events" desc="Alert on successful stake deployment or payout." active={false} />
            </div>
        </div>
    );
}

function WalletSettings() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SectionHeader title="Capital Control" icon={<Wallet size={18} />} desc="Manage connected nodes and payment gateways." />
            <div className="p-8 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-900 text-center">
                <Globe size={40} className="mx-auto text-slate-800 mb-4" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">
                    No Web3 Provider Detected.<br />
                    Connect a custodial node to enable external transfers.
                </p>
                <button className="mt-6 px-6 py-3 rounded-2xl bg-brand-accent text-slate-950 font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Link Wallet Node</button>
            </div>
        </div>
    );
}

function SectionHeader({ title, desc }) {
    return (
        <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">{title}</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{desc}</p>
        </div>
    );
}

function InputGroup({ label, value, disabled = false }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
            <input
                type="text"
                value={value}
                disabled={disabled}
                className={cn(
                    "w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all",
                    disabled && "bg-slate-950 opacity-40 cursor-not-allowed"
                )}
            />
        </div>
    );
}

function ToggleOption({ icon, title, desc, active }) {
    return (
        <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-900/50 border border-slate-800 group hover:border-slate-700 transition-all">
            <div className="flex items-center gap-4">
                {icon && <div className="text-slate-600 group-hover:text-brand-accent transition-colors">{icon}</div>}
                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-tight">{title}</h3>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-sm">{desc}</p>
                </div>
            </div>
            <button className={cn(
                "w-12 h-6 rounded-full relative transition-all duration-300",
                active ? "bg-brand-accent" : "bg-slate-800"
            )}>
                <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                    active ? "left-7" : "left-1"
                )} />
            </button>
        </div>
    );
}
