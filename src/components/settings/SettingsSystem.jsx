import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Shield,
    Eye,
    Bell,
    Zap,
    Lock,
    Key,
    Monitor,
    Save,
    ShieldAlert,
    Github,
    Mail,
    Smartphone,
    Loader2
} from 'lucide-react';
import { useStore } from '../../store/storeModel';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export function SettingsSystem() {
    const [activeTab, setActiveTab] = useState('identity');
    const [saving, setSaving] = useState(false);
    const { user, tier } = useStore();

    // Lifted state for IdentityTab
    const [oracleHandle, setOracleHandle] = useState(user?.oracleHandle || '');
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [handleStatus, setHandleStatus] = useState(null); // 'checking', 'available', 'taken'

    const tabs = [
        { id: 'identity', label: 'Identity', icon: <User size={16} /> },
        { id: 'security', label: 'Security', icon: <Shield size={16} /> },
        { id: 'privacy', label: 'Privacy', icon: <Eye size={16} /> },
        { id: 'notifications', label: 'Alerts', icon: <Bell size={16} /> },
        { id: 'api', label: 'Developer', icon: <Key size={16} /> },
    ];

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === 'identity') {
                if (handleStatus === 'taken') {
                    toast.error("Oracle Handle is taken!");
                    setSaving(false);
                    return;
                }
                const { apiPatch } = await import('../../lib/api.js');
                const updated = await apiPatch('/api/user/profile', {
                    oracleHandle: oracleHandle.trim() || undefined,
                    displayName: displayName.trim() || undefined
                });

                if (updated) {
                    useStore.setState((state) => ({ user: { ...state.user, ...updated } }));
                    toast.success("Profile updated successfully!");
                }
            } else {
                // Dummy save for other tabs
                await new Promise(r => setTimeout(r, 500));
            }
        } catch (error) {
            console.error("Save failed:", error);
            toast.error("Save failed, please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 min-h-[600px]">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 space-y-1">
                <div className="px-4 py-3 mb-4 rounded-2xl bg-slate-900/50 border border-slate-800">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">User Tier</div>
                    <div className="text-sm font-black text-brand-accent uppercase tracking-tighter flex items-center gap-1.5">
                        <Zap size={14} fill="currentColor" /> {tier}
                    </div>
                </div>

                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                            activeTab === tab.id
                                ? "bg-brand-accent/10 text-brand-accent border-r-2 border-brand-accent"
                                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 md:p-8 rounded-3xl bg-slate-950 border border-slate-900 shadow-2xl relative overflow-y-auto overflow-x-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    {tabs.find(t => t.id === activeTab)?.icon && React.cloneElement(tabs.find(t => t.id === activeTab).icon, { size: 120 })}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10"
                    >
                        {activeTab === 'identity' && (
                            <IdentityTab
                                user={user}
                                oracleHandle={oracleHandle}
                                setOracleHandle={setOracleHandle}
                                displayName={displayName}
                                setDisplayName={setDisplayName}
                                handleStatus={handleStatus}
                                setHandleStatus={setHandleStatus}
                            />
                        )}
                        {activeTab === 'security' && <SecurityTab />}
                        {activeTab === 'privacy' && <PrivacyTab />}
                        {activeTab === 'notifications' && <NotificationTab />}
                        {activeTab === 'api' && <ApiTab />}
                    </motion.div>
                </AnimatePresence>

                <div className="mt-12 pt-6 border-t border-slate-900 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 rounded-xl bg-brand-accent text-slate-950 font-black text-sm uppercase tracking-widest hover:bg-white transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-brand-accent/20"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                        {saving ? "Syncing..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function IdentityTab({ user, oracleHandle, setOracleHandle, displayName, setDisplayName, handleStatus, setHandleStatus }) {

    // Check handle availability when it changes
    React.useEffect(() => {
        if (!oracleHandle || oracleHandle === user?.oracleHandle) {
            setHandleStatus(null);
            return;
        }

        const checkHandle = async () => {
            setHandleStatus('checking');
            try {
                const { apiGet } = await import('../../lib/api.js');
                const res = await apiGet(`/api/user/check-handle?handle=${oracleHandle}`);
                if (res?.available !== undefined) {
                    setHandleStatus(res.available ? 'available' : 'taken');
                } else {
                    setHandleStatus(null);
                }
            } catch (e) {
                setHandleStatus(null);
            }
        };

        const timeoutId = setTimeout(checkHandle, 500);
        return () => clearTimeout(timeoutId);
    }, [oracleHandle, user?.oracleHandle, setHandleStatus]);

    return (
        <div className="space-y-6">
            <header>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Account & Identity</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Manage your public profile and verified connections.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                        <span>Oracle Handle <span className="text-brand-accent">*</span></span>
                        {handleStatus === 'checking' && <span className="text-amber-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Checking</span>}
                        {handleStatus === 'available' && <span className="text-emerald-500">✓ Available</span>}
                        {handleStatus === 'taken' && <span className="text-rose-500">✗ Taken</span>}
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">@</span>
                        <input
                            type="text"
                            value={oracleHandle}
                            onChange={(e) => setOracleHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                            maxLength={20}
                            placeholder="starranker_01"
                            className={cn(
                                "w-full bg-slate-900 border rounded-xl pl-8 pr-4 py-3 text-sm text-slate-200 focus:outline-none transition-colors",
                                handleStatus === 'taken' ? "border-rose-500/50 focus:ring-1 focus:ring-rose-500" : "border-slate-800 focus:ring-1 focus:ring-brand-accent"
                            )}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Display Name</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Captain Ranker"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Linked Providers</h4>
                <div className="grid grid-cols-1 gap-3">
                    <ProviderRow icon={<Github size={16} />} label="GitHub" connected={true} username="bgadz" />
                    <ProviderRow icon={<Mail size={16} />} label="Google / Email" connected={true} username={user?.email} />
                    <ProviderRow icon={<Smartphone size={16} />} label="Wallet" connected={false} />
                </div>
            </div>
        </div>
    );
}

function SecurityTab() {
    return (
        <div className="space-y-6">
            <header>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Security Terminal</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Hardened account protection and session control.</p>
            </header>

            <div className="space-y-4">
                <ToggleRow
                    title="Two-Factor Authentication"
                    desc="Required for stakes over $1,000."
                    active={true}
                />
                <ToggleRow
                    title="Hardware Key Protection"
                    desc="Enable Yubikey support for admin actions."
                    active={false}
                />
            </div>

            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-3">
                <ShieldAlert className="text-rose-500 shrink-0" size={20} />
                <div>
                    <h4 className="text-xs font-black text-rose-500 uppercase">Critical Activity Alerts</h4>
                    <p className="text-[10px] text-slate-500 leading-tight">We will notify your backup email if a stake exceeding 50% of your bankroll is placed.</p>
                </div>
            </div>
        </div>
    );
}

function PrivacyTab() {
    return (
        <div className="space-y-6">
            <header>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Privacy & Visibility</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Control how your influence is seen by other Oracles.</p>
            </header>

            <div className="space-y-4">
                <ToggleRow
                    title="Public Portfolio"
                    desc="Allow others to see your active staking positions."
                    active={true}
                />
                <ToggleRow
                    title="Anonymous Voting"
                    desc="Hide your username in the 'Recent Activity' feed."
                    active={false}
                />
                <ToggleRow
                    title="Data Integrity Opt-out"
                    desc="Prevent your voting patterns from informing the Global Sentiment chart."
                    active={false}
                />
            </div>
        </div>
    );
}

function NotificationTab() {
    return (
        <div className="space-y-6">
            <header>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Alert Etiquette</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Manage real-time notifications for market moves.</p>
            </header>

            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-xs font-black text-slate-200 uppercase mb-2">Stake Settlements</h4>
                        <div className="space-y-2">
                            <CheckboxRow label="Direct Messages" checked={true} />
                            <CheckboxRow label="In-App Toast" checked={true} />
                            <CheckboxRow label="Push Notifications" checked={false} />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-slate-200 uppercase mb-2">Market Reification</h4>
                        <div className="space-y-2">
                            <CheckboxRow label="Rank Shifts > 5" checked={true} />
                            <CheckboxRow label="New Category Gen" checked={false} />
                            <CheckboxRow label="Admin Broadcasts" checked={true} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ApiTab() {
    const [visible, setVisible] = useState(false);
    return (
        <div className="space-y-6">
            <header>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Developer Terminal</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Integrate Star Ranker data into your own applications.</p>
            </header>

            <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-200 uppercase">Production API Key</h4>
                        <span className="text-[10px] font-black text-amber-500 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">Oracle Tier Only</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs text-slate-400 overflow-hidden">
                            {visible ? "sk_live_8f39...k92z1p" : "••••••••••••••••••••••••••••"}
                        </div>
                        <button
                            onClick={() => setVisible(!visible)}
                            className="px-4 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                        >
                            <Monitor size={16} />
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-500">Your API key provides read-access to real-time MWR snapshots.</p>
                </div>
            </div>
        </div>
    );
}

// Sub-components
function ProviderRow({ icon, label, connected, username }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/50">
            <div className="flex items-center gap-3">
                <div className="text-slate-500">{icon}</div>
                <div>
                    <div className="text-[10px] font-black text-slate-300 uppercase">{label}</div>
                    {username && <div className="text-[10px] text-slate-500 font-mono">{username}</div>}
                </div>
            </div>
            <button className={cn(
                "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all",
                connected ? "bg-slate-800 text-slate-400 hover:text-rose-500" : "bg-brand-accent text-slate-950 hover:bg-white"
            )}>
                {connected ? "Disconnect" : "Connect"}
            </button>
        </div>
    );
}

function ToggleRow({ title, desc, active }) {
    const [enabled, setEnabled] = useState(active);
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div>
                <h4 className="text-xs font-black text-slate-100 uppercase mb-0.5">{title}</h4>
                <p className="text-[10px] text-slate-500">{desc}</p>
            </div>
            <button
                onClick={() => setEnabled(!enabled)}
                className={cn(
                    "w-10 h-5 rounded-full relative transition-colors p-1",
                    enabled ? "bg-emerald-500" : "bg-slate-700"
                )}
            >
                <div className={cn(
                    "w-3 h-3 bg-white rounded-full transition-all",
                    enabled ? "translate-x-5" : "translate-x-0"
                )} />
            </button>
        </div>
    );
}

function CheckboxRow({ label, checked }) {
    const [val, setVal] = useState(checked);
    return (
        <label className="flex items-center gap-2 cursor-pointer group">
            <div className={cn(
                "w-4 h-4 rounded border transition-all flex items-center justify-center",
                val ? "bg-brand-accent border-brand-accent" : "border-slate-700 group-hover:border-slate-500"
            )}>
                {val && <div className="w-2 h-2 bg-slate-950 rounded-sm" />}
                <input type="checkbox" className="hidden" onChange={() => setVal(!val)} checked={val} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase">{label}</span>
        </label>
    );
}
