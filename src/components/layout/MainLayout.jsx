import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart3,
    ShieldCheck,
    Settings,
    Bell,
    Search,
    User,
    Zap,
    Menu,
    X,
    ChevronRight,
    Wallet,
    Info,
    LifeBuoy,
    LogOut,
    ChevronDown,
    Activity,
    Award,
    Terminal,
    History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/storeModel';
import { cn } from '../../lib/utils';
import EpochIndicator from '../epochs/EpochIndicator';
import { LiveTicker } from '../LiveTicker';
import { Web3Status } from '../Web3Status';
import { DepositModal } from '../DepositModal';
import { VotePackModal } from '../VotePackModal';
import BottomNav from '../BottomNav';
import MobileHeader from '../MobileHeader';

export function MainLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const [isNotifOpen, setNotifOpen] = useState(false);
    const [isDepositOpen, setDepositOpen] = useState(false);
    const [isVotePackModalOpen, setVotePackModalOpen] = useState(false);
    const { user, login, logout, balance, reputation, tier, notifications, markNotificationAsRead, searchQuery, setSearchQuery } = useStore();
    const navigate = useNavigate();
    const location = useLocation();

    const mainNav = [
        { to: "/markets", icon: <BarChart3 size={18} />, label: "Markets" },
        { to: "/activity", icon: <Activity size={18} />, label: "Activity" },
        { to: "/leaderboards", icon: <Award size={18} />, label: "Leaderboards" },
    ];

    const userNav = [
        { to: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Portfolio" },
        { to: "/notifications", icon: <Bell size={18} />, label: "Alerts", count: notifications.filter(n => !n.read).length },
        { to: "/settings", icon: <Settings size={18} />, label: "Settings" },
    ];

    const infoNav = [
        { to: "/how-it-works", icon: <Info size={18} />, label: "How it Works" },
        { to: "/transparency", icon: <ShieldCheck size={18} />, label: "Transparency" },
        { to: "/history", icon: <History size={18} />, label: "Epoch History" },
    ];

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="flex h-screen bg-brand-bg text-slate-200 overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside className={cn(
                "hidden md:flex flex-col bg-brand-surface border-r border-brand-border transition-all duration-300 relative z-[110]",
                isSidebarOpen ? "w-64" : "w-16"
            )}>
                <div className="p-4 flex items-center justify-between border-b border-brand-border h-16 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center text-slate-950 shrink-0">
                            <Zap size={20} fill="currentColor" />
                        </div>
                        {isSidebarOpen && <span className="font-black text-white tracking-tighter text-lg whitespace-nowrap">STAR RANKER</span>}
                    </div>
                </div>

                <div className="flex-1 py-4 px-2 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Main Loop */}
                    <NavSection title="Terminal" isOpen={isSidebarOpen}>
                        {mainNav.map(item => (
                            <NavItem key={item.to} {...item} isOpen={isSidebarOpen} />
                        ))}
                    </NavSection>

                    {/* Personal Loop */}
                    <NavSection title="Personal" isOpen={isSidebarOpen}>
                        {userNav.map(item => (
                            <NavItem key={item.to} {...item} isOpen={isSidebarOpen} />
                        ))}
                        {tier === 'Oracle' && (
                            <NavItem to="/admin/zmg" icon={<ShieldCheck size={18} />} label="Admin ZMG" isOpen={isSidebarOpen} />
                        )}
                        {(user?.isAdmin || user?.isModerator) && (
                            <NavItem to="/admin/ops" icon={<Terminal size={18} />} label="Overwatch" isOpen={isSidebarOpen} />
                        )}
                    </NavSection>

                    {/* Support Loop */}
                    <NavSection title="Resources" isOpen={isSidebarOpen}>
                        {infoNav.map(item => (
                            <NavItem key={item.to} {...item} isOpen={isSidebarOpen} />
                        ))}
                    </NavSection>
                </div>

                {/* Sidebar Footer / User Context */}
                <div className="p-2 border-t border-brand-border space-y-2">
                    {isSidebarOpen && user && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
                                <span>Bankroll</span>
                                <span className="text-emerald-500">{useStore.getState().formatValue(balance)}</span>
                            </div>
                            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500/40 w-[70%]" />
                            </div>
                        </div>
                    )}
                    {isSidebarOpen && user && (
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setDepositOpen(true)}
                                className="w-full py-2 rounded-xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all min-h-[40px]"
                            >
                                + Fund Wallet
                            </button>
                            <button
                                onClick={() => setVotePackModalOpen(true)}
                                className="w-full py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 border-transparent hover:text-slate-950 transition-all min-h-[40px] flex items-center justify-center gap-1"
                            >
                                <Zap size={12} fill="currentColor" /> GET POWER VOTES
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>
                </div>
            </aside>

            {/* Main Application Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-[56px] md:pb-0">
                <MobileHeader />
                {/* Top Navigation Bar */}
                <header className="hidden md:flex h-16 border-b border-brand-border bg-brand-bg/80 backdrop-blur-md items-center justify-between px-6 shrink-0 z-40">
                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        <div className="relative flex-1 group">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-accent transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (location.pathname !== '/markets') navigate('/markets');
                                }}
                                placeholder="Search markets (Cmd+K)..."
                                className="w-full bg-slate-900/50 border border-brand-border rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:bg-slate-900 transition-all font-medium font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <Web3Status />
                        {/* Currency Toggle */}
                        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
                            {['USD', 'NGN', 'EUR'].map(code => (
                                <button
                                    key={code}
                                    onClick={() => useStore.getState().setCurrency(code)}
                                    className={cn(
                                        "px-2 py-1 text-[9px] font-black rounded-md transition-all",
                                        useStore.getState().currency === code ? "bg-brand-accent text-slate-950" : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {code}
                                </button>
                            ))}
                        </div>

                        <EpochIndicator />

                        {/* Notification Hub */}
                        <div className="relative">
                            <button
                                onClick={() => setNotifOpen(!isNotifOpen)}
                                className="relative p-2 rounded-xl border border-brand-border text-slate-500 hover:text-white hover:bg-slate-800 transition-all font-mono"
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent rounded-full text-[10px] font-black text-slate-950 flex items-center justify-center animate-pulse">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-14 right-0 w-80 p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-3xl z-50 overflow-hidden"
                                    >
                                        <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center mb-2">
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Oracle Alerts</h3>
                                            <button onClick={() => setNotifOpen(false)} className="text-slate-600 hover:text-white"><X size={14} /></button>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1">
                                            {notifications.length > 0 ? notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => { markNotificationAsRead(n.id); setNotifOpen(false); }}
                                                    className={cn(
                                                        "p-3 rounded-xl transition-all cursor-pointer group",
                                                        n.read ? "opacity-40" : "bg-slate-800/30 hover:bg-slate-800"
                                                    )}
                                                >
                                                    <div className="flex gap-3">
                                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0" />
                                                        <div className="space-y-1">
                                                            <p className="text-[11px] font-bold text-slate-300 leading-tight group-hover:text-white">{n.message}</p>
                                                            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">12M AGO • TRACED</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="py-10 text-center space-y-2 opacity-50">
                                                    <Bell size={24} className="mx-auto text-slate-700" />
                                                    <p className="text-[10px] font-black uppercase text-slate-600">No active alerts</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2 border-t border-slate-800 mt-2">
                                            <button
                                                onClick={() => { navigate('/notifications'); setNotifOpen(false); }}
                                                className="w-full py-2 text-[9px] font-black text-slate-500 uppercase hover:text-brand-accent transition-colors"
                                            >
                                                Archive Console
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Auth / Profile Area */}
                        {!user ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate('/signin')}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="px-5 py-2.5 rounded-xl bg-brand-accent text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-brand-accent/20 flex items-center gap-2"
                                >
                                    <Wallet size={14} fill="currentColor" />
                                    Connect
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 relative">
                                <div className="text-right hidden sm:block">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user.username || 'Oracle'}</div>
                                    <div className="text-[10px] font-mono text-emerald-500 font-bold">{useStore.getState().formatValue(balance)}</div>
                                </div>
                                <button
                                    onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                                    className="w-10 h-10 rounded-xl border border-brand-border overflow-hidden bg-slate-800 hover:border-brand-accent/50 transition-all flex items-center justify-center"
                                >
                                    {user.photo ? (
                                        <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={20} className="text-slate-400" />
                                    )}
                                </button>

                                {isUserMenuOpen && (
                                    <div className="absolute top-14 right-0 w-56 p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50">
                                        <div className="px-3 py-2 border-b border-slate-800 mb-2">
                                            <p className="text-[10px] font-black text-slate-500 uppercase">{tier} Tier</p>
                                            <p className="text-xs font-bold text-slate-200 truncate">{user.email}</p>
                                        </div>
                                        <button onClick={() => { navigate('/dashboard'); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                                            <LayoutDashboard size={14} /> My Portfolio
                                        </button>
                                        <button onClick={() => { navigate('/settings'); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                                            <Settings size={14} /> Settings
                                        </button>
                                        <button onClick={() => { logout(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all mt-2">
                                            <LogOut size={14} /> Disconnect
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="flex-1 pb-10">
                        <Outlet />
                    </div>

                    {/* Footer / Legal Protection Layer */}
                    <footer className="mt-auto border-t border-slate-800/50 pt-6 pb-20 px-4 shrink-0">
                        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <Link to="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
                                <span className="text-slate-800">•</span>
                                <Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
                                <span className="text-slate-800">•</span>
                                <Link to="/legal/responsible-play" className="text-rose-500/80 hover:text-rose-400 transition-colors">Responsible Play</Link>
                            </div>

                            <div className="flex flex-col items-center md:items-end gap-2">
                                <a href="mailto:support@starranker.io" className="text-[10px] font-bold text-slate-600 hover:text-brand-accent transition-colors">
                                    support@starranker.io
                                </a>
                                <p className="text-[10px] text-slate-700 font-bold">
                                    &copy; 2026 Star Ranker Technologies Limited
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-center">
                            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest">
                                BETA — Balances subject to reset
                            </div>
                        </div>
                    </footer>
                </div>

                {/* Global Features */}
                <div className="absolute bottom-[56px] md:bottom-0 left-0 w-full z-[100]">
                    <LiveTicker />
                </div>
            </main>
            <BottomNav />
            <DepositModal isOpen={isDepositOpen} onClose={() => setDepositOpen(false)} />
            <VotePackModal isOpen={isVotePackModalOpen} onClose={() => setVotePackModalOpen(false)} />
        </div>
    );
}

function NavSection({ title, children, isOpen }) {
    return (
        <div className="space-y-1">
            {isOpen && <h3 className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">{title}</h3>}
            {children}
        </div>
    );
}

function NavItem({ to, icon, label, isOpen, count }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                isActive ? "bg-brand-accent/10 text-brand-accent shadow-[inset_0_0_10px_rgba(56,189,248,0.05)]" : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-200"
            )}
        >
            <div className="shrink-0">{icon}</div>
            {isOpen && <span className="text-sm font-bold truncate">{label}</span>}
            {isOpen && count > 0 && (
                <span className="ml-auto w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                    {count}
                </span>
            )}
            {!isOpen && (
                <div className="absolute left-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                    {label}
                </div>
            )}
        </NavLink>
    );
}
