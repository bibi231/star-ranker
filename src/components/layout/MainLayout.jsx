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
    History,
    TrendingUp,
    Shield,
    PlusSquare,
    BarChart2,
    RefreshCw,
    Swords,
    Brain,
    HelpCircle,
    BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/storeModel';
import { cn } from '../../lib/utils';
import { isSuperAdminEmail } from '../../lib/superAdmins.js';
import EpochIndicator from '../epochs/EpochIndicator';
import { LiveTicker } from '../LiveTicker';
import { Web3Status } from '../Web3Status';
import { useIsMobile } from '../../hooks/useIsMobile';
import { DepositModal } from '../DepositModal';
import { VotePackModal } from '../VotePackModal';
import { WithdrawalModal } from '../WithdrawalModal';
import { NotificationsPanel } from '../NotificationsPanel';
import BottomNav from '../BottomNav';
import MobileHeader from '../MobileHeader';
import { Footer } from './Footer';
import { DemoModeToggle } from '../DemoModeToggle';
import ThemeToggle from '../ThemeToggle';
import { OnboardingTour } from '../onboarding/OnboardingTour';
import { DemoConversionModal } from '../DemoConversionModal';
import { TierBadge } from '../TierBadge';
import GlobalSearch from '../GlobalSearch';
import { Search } from 'lucide-react';

export function MainLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const [isNotifOpen, setNotifOpen] = useState(false);
    const [isSearchOpen, setSearchOpen] = useState(false);

    // CMD/CTRL+K to open global search
    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen((v) => !v);
            } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const {
        user, login, logout, balance, reputation, tier,
        notifications, markNotificationAsRead,
        searchQuery, setSearchQuery, formatValue,
        isDepositOpen, setDepositOpen,
        isVotePackModalOpen, setVotePackModalOpen,
        isWithdrawalOpen, setWithdrawalOpen,
        fetchUserProfile,
        isDemoMode, demoBalance, rates, currency
    } = useStore();

    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();

    const unreadCount = (notifications || []).filter(n => !n.read).length;

    const NavItem = ({ to, icon: Icon, label, compact, onClick }) => (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive
                    ? "bg-[#1E3A5F]/50 text-brand-accent border border-brand-accent/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent",
                compact && "justify-center px-0"
            )}
        >
            <Icon size={18} className={cn(compact ? "" : "shrink-0")} />
            {!compact && (
                <span className="font-bold text-[11px] uppercase tracking-wider">{label}</span>
            )}
        </NavLink>
    );

    const NavSection = ({ title, children, compact }) => (
        <div className="space-y-1 mb-6">
            {!compact && (
                <h4 className="px-3 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    {title}
                </h4>
            )}
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#020617] noise-bg text-slate-200 overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside className={cn(
                "hidden md:flex flex-col glass-panel border-r border-[#1E3A5F]/30 transition-all duration-300 relative z-[110]",
                isSidebarOpen ? "w-64" : "w-16"
            )}>
                {/* Brand */}
                <div className="h-24 flex items-center px-8 shrink-0 cursor-pointer" onClick={() => navigate('/')} data-tour="header-logo">
                    <img src={isSidebarOpen ? "/assets/logo-horizontal.png" : "/assets/logo-horizontal.png"} alt="Star Ranker" className={cn("transition-all duration-300 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]", isSidebarOpen ? "h-22 w-auto" : "h-14 w-auto")} />
                </div>

                {/* Sidebar Demo Toggle */}
                <div className="px-6 mb-4" data-tour="demo-toggle">
                    <DemoModeToggle />
                </div>

                {/* Theme toggle */}
                {isSidebarOpen && (
                    <div className="px-6 mb-3">
                        <ThemeToggle />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
                    <NavSection title="TERMINAL" compact={!isSidebarOpen}>
                        <NavItem to="/markets" icon={BarChart2} label="Markets" compact={!isSidebarOpen} />
                        <NavItem to="/battles" icon={Swords} label="Battles Arena" compact={!isSidebarOpen} />
                        <NavItem to="/trial" icon={Brain} label="Oracle Trial" compact={!isSidebarOpen} />
                        <NavItem to="/activity" icon={Activity} label="Activity" compact={!isSidebarOpen} />
                        <NavItem to="/leaderboards" icon={Award} label="Leaderboards" compact={!isSidebarOpen} />
                    </NavSection>

                    <NavSection title="PERSONAL" compact={!isSidebarOpen}>
                        <NavItem to="/portfolio" icon={LayoutDashboard} label="Portfolio" compact={!isSidebarOpen} />
                        <NavItem to="/notifications" icon={Bell} label="Alerts" compact={!isSidebarOpen} onClick={() => setNotifOpen(false)} />
                        <NavItem to="/settings" icon={Settings} label="Settings" compact={!isSidebarOpen} />
                        <NavItem to="/history" icon={History} label="History" compact={!isSidebarOpen} />
                        {user?.email && isSuperAdminEmail(user.email) && (
                            <NavItem to="/admin/zmg" icon={PlusSquare} label="Admin ZMG" compact={!isSidebarOpen} />
                        )}
                    </NavSection>

                    {user?.email && isSuperAdminEmail(user.email) && (
                        <NavSection title="SYSTEM CORE" compact={!isSidebarOpen}>
                            <NavItem to="/admin" icon={Terminal} label="Terminal" compact={!isSidebarOpen} />
                            <NavItem to="/admin/ops" icon={Shield} label="Meta Controls" compact={!isSidebarOpen} />
                        </NavSection>
                    )}

                    <NavSection title="RESOURCES" compact={!isSidebarOpen}>
                        <NavItem to="/how-it-works" icon={Info} label="How it Works" compact={!isSidebarOpen} />
                        <NavItem to="/faq" icon={HelpCircle} label="FAQ" compact={!isSidebarOpen} />
                        <NavItem to="/api-docs" icon={BookOpen} label="API Documentation" compact={!isSidebarOpen} />
                        <NavItem to="/transparency" icon={ShieldCheck} label="Transparency" compact={!isSidebarOpen} />
                    </NavSection>
                </div>

                {/* Sidebar Footer - Matching Screenshot */}
                <div className="p-4 bg-slate-950/40 border-t border-white/5 space-y-3">
                    {user && isSidebarOpen && (
                        <>
                            <div className="px-2 space-y-1.5">
                                <div className="hidden md:flex flex-col items-end">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => fetchUserProfile()}
                                            className="p-1 hover:bg-white/5 rounded transition-colors text-slate-500 hover:text-brand-accent"
                                            title="Sync Ledger"
                                        >
                                            <RefreshCw size={10} />
                                        </button>
                                        <span className={cn("text-[10px] font-mono font-black italic", isDemoMode ? "text-amber-400" : "text-emerald-400")}>
                                            {isDemoMode ? formatValue(demoBalance) : formatValue(balance)}
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 px-1.5 py-0.5 rounded border border-white/5">
                                        {isDemoMode ? 'Practice Credits' : 'Liquid Capital'}
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: isDemoMode ? `${Math.min(100, (demoBalance / 50000) * 100)}%` : `${Math.min(100, (balance / 10000) * 100)}%` }}
                                        className={cn(
                                            "h-full transition-all duration-500",
                                            isDemoMode 
                                                ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                                                : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                        )}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setDepositOpen(true)}
                                className={cn(
                                    "w-full py-3 rounded-xl text-[10px] tracking-[0.15em] flex items-center justify-center gap-2 font-black uppercase transition-all active:scale-[0.98]",
                                    isDemoMode ? "premium-btn-gold" : "bg-emerald-500 text-slate-950 border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400"
                                )}
                            >
                                <PlusSquare size={14} strokeWidth={3} /> {isDemoMode ? "Reset Practice Balance" : "Fund Real Wallet"}
                            </button>
                            <button
                                onClick={() => setWithdrawalOpen(true)}
                                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                            >
                                <Wallet size={14} /> {isDemoMode ? "Withdraw Profit" : "Withdraw"}
                            </button>
                            <button
                                onClick={() => setVotePackModalOpen(true)}
                                className="w-full py-3 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-brand-accent/20 transition-all font-mono"
                            >
                                <Zap size={14} className="fill-brand-accent" /> {isDemoMode ? "Acquire Influence" : "Get Power Votes"}
                            </button>
                        </>
                    )}

                    {user ? (
                        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-rose-400 transition-colors">
                            <LogOut size={16} />
                            {isSidebarOpen && <span className="text-[9px] font-bold uppercase tracking-widest">Sign Out</span>}
                        </button>
                    ) : (
                        <button onClick={() => navigate('/signin')} className="w-full py-3 rounded-xl bg-brand-accent text-[#0D1B2A] font-black text-[10px] uppercase tracking-widest">
                            Connect Identity
                        </button>
                    )}
                </div>
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md md:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 w-72 z-[130] glass-panel border-r border-brand-accent/20 flex flex-col md:hidden"
                        >
                            <div className="h-32 flex flex-col justify-center px-8 border-b border-white/5 bg-slate-950/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src="/assets/logo.png" alt="Star Ranker" className="h-16 w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                                    </div>
                                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500"><X size={24} /></button>
                                </div>
                                <div className="mt-2" data-tour="demo-toggle">
                                    <DemoModeToggle />
                                </div>
                                {/* Mobile Currency Switcher */}
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0">Currency</span>
                                    <div className="flex bg-slate-950 border border-[#1E3A5F]/30 rounded p-0.5 flex-1">
                                        {['USD', 'NGN', 'EUR', 'GBP'].map(code => (
                                            <button
                                                key={code}
                                                onClick={() => useStore.getState().setCurrency(code)}
                                                className={cn(
                                                    "flex-1 py-1.5 text-[9px] font-black rounded transition-all text-center",
                                                    useStore.getState().currency === code ? "bg-[#1E3A5F] text-brand-accent" : "text-slate-500 active:text-white"
                                                )}
                                            >
                                                {code}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
                                <NavSection title="TERMINAL">
                                    <NavItem to="/markets" icon={BarChart2} label="Markets" onClick={() => setIsMobileMenuOpen(false)} />
                                    <NavItem to="/battles" icon={Zap} label="Oracle Battles" onClick={() => setIsMobileMenuOpen(false)} />
                                    <NavItem to="/activity" icon={Activity} label="Activity" onClick={() => setIsMobileMenuOpen(false)} />
                                    <NavItem to="/leaderboards" icon={Award} label="Leaderboards" onClick={() => setIsMobileMenuOpen(false)} />
                                </NavSection>

                                <NavSection title="PERSONAL">
                                    <NavItem to="/portfolio" icon={LayoutDashboard} label="Portfolio" onClick={() => setIsMobileMenuOpen(false)} />
                                    <NavItem to="/notifications" icon={Bell} label="Alerts" onClick={() => { setIsMobileMenuOpen(false); setNotifOpen(true); }} />
                                    <NavItem to="/settings" icon={Settings} label="Settings" onClick={() => setIsMobileMenuOpen(false)} />
                                    {user?.email && isSuperAdminEmail(user.email) && (
                                        <NavItem to="/admin/zmg" icon={PlusSquare} label="Admin ZMG" onClick={() => setIsMobileMenuOpen(false)} />
                                    )}
                                </NavSection>

                                {user?.email && isSuperAdminEmail(user.email) && (
                                    <NavSection title="SYSTEM CORE">
                                        <NavItem to="/admin" icon={Terminal} label="Terminal" onClick={() => setIsMobileMenuOpen(false)} />
                                        <NavItem to="/admin/ops" icon={Shield} label="Meta Controls" onClick={() => setIsMobileMenuOpen(false)} />
                                    </NavSection>
                                )}

                                <NavSection title="RESOURCES">
                                    <NavItem to="/how-it-works" icon={Info} label="How it Works" onClick={() => setIsMobileMenuOpen(false)} />
                                    <NavItem to="/faq" icon={HelpCircle} label="FAQ" onClick={() => setIsMobileMenuOpen(false)} />
                                    <NavItem to="/api-docs" icon={BookOpen} label="API Documentation" onClick={() => setIsMobileMenuOpen(false)} />
                                    <NavItem to="/transparency" icon={ShieldCheck} label="Transparency" onClick={() => setIsMobileMenuOpen(false)} />
                                    <NavItem to="/history" icon={History} label="History" onClick={() => setIsMobileMenuOpen(false)} />
                                </NavSection>
                            </div>

                            <div className="p-6 bg-slate-950/40 border-t border-white/5 space-y-4">
                                {user && (
                                    <>
                                        <div className="px-1 space-y-1.5 mb-2">
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => fetchUserProfile()}
                                                        className="p-1 hover:bg-white/5 rounded transition-colors text-slate-500 hover:text-[#C9A84C]"
                                                        title="Sync Ledger"
                                                    >
                                                        <RefreshCw size={10} />
                                                    </button>
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{isDemoMode ? 'PRACTICE' : 'Bankroll'}</span>
                                                </div>
                                                <span className="text-[10px] font-mono font-black text-emerald-400 italic">
                                                    {isDemoMode ? `★${(demoBalance * (rates[currency] || 1)).toLocaleString()}` : (currency === 'USD' ? `★${formatValue(balance).replace('$', '')}` : formatValue(balance))}
                                                </span>
                                            </div>
                                            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: isDemoMode ? `${Math.min(100, (demoBalance / 50000) * 100)}%` : `${Math.min(100, (balance / 10000) * 100)}%` }}
                                                    className={cn("h-full shadow-[0_0_10px_rgba(245,158,11,0.5)]", "bg-amber-500")}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setDepositOpen(true); setIsMobileMenuOpen(false); }}
                                            className="w-full py-4 rounded-2xl premium-btn-gold text-xs tracking-widest flex items-center justify-center gap-3 shadow-lg"
                                        >
                                            <PlusSquare size={18} strokeWidth={3} /> {isDemoMode ? 'Reset Practice Balance' : 'Fund Wallet'}
                                        </button>
                                        <button
                                            onClick={() => { setWithdrawalOpen(true); setIsMobileMenuOpen(false); }}
                                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3"
                                        >
                                            <Wallet size={18} /> {isDemoMode ? 'Withdraw Profit' : 'Withdraw'}
                                        </button>
                                        <button
                                            onClick={() => { setVotePackModalOpen(true); setIsMobileMenuOpen(false); }}
                                            className="w-full py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3"
                                        >
                                            <Zap size={18} className="fill-amber-500" /> {isDemoMode ? 'Acquire Influence' : 'Get Power Votes'}
                                        </button>
                                    </>
                                )}
                                {user ? (
                                    <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="w-full py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                        Disconnect
                                    </button>
                                ) : (
                                    <button onClick={() => { navigate('/signin'); setIsMobileMenuOpen(false); }} className="w-full py-4 rounded-2xl bg-brand-accent text-[#0D1B2A] font-black uppercase text-xs tracking-widest">
                                        Connect Identity
                                    </button>
                                )}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={{ paddingBottom: 'calc(56px + var(--safe-bottom, 0px))' }}>
                <MobileHeader
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                    onFundClick={() => setDepositOpen(true)}
                    onNotifClick={() => setNotifOpen(!isNotifOpen)}
                    unreadCount={unreadCount}
                />

                {/* Desktop Header — responsive: md=compact, lg=full */}
                <header className="hidden md:flex h-16 border-b border-[#1E3A5F]/30 glass-panel bg-opacity-80 items-center justify-between px-4 lg:px-6 shrink-0 z-40 gap-3">
                    {/* LEFT: Search (lg only) + Web3 (lg only) */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Search — hidden on md, visible on lg */}
                        <div className="relative hidden lg:block flex-1 max-w-sm group">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-accent transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (location.pathname !== '/markets') navigate('/markets');
                                }}
                                placeholder="Search markets (Cmd+K)..."
                                className="w-full bg-[#020617]/50 border border-[#1E3A5F]/50 rounded-xl pl-11 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-accent/50 focus:bg-[#020617] transition-all font-medium tracking-wide"
                            />
                        </div>
                        {/* Search icon button on md (opens search on click) */}
                        <button
                            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                            onClick={() => {
                                const q = prompt('Search markets...');
                                if (q) {
                                    setSearchQuery(q);
                                    if (location.pathname !== '/markets') navigate('/markets');
                                }
                            }}
                            title="Search"
                        >
                            <Search size={16} />
                        </button>
                        {/* Web3 — hidden on md, visible on xl */}
                        <div className="hidden xl:block">
                            <Web3Status />
                        </div>
                    </div>

                    {/* RIGHT: Currency + Epoch + Notif + User */}
                    <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                        {/* Currency Switcher — always visible but compact */}
                        <div className="flex bg-slate-950 border border-[#1E3A5F]/30 rounded p-0.5">
                            {['USD', 'NGN', 'EUR', 'GBP'].map(code => (
                                <button
                                    key={code}
                                    onClick={() => useStore.getState().setCurrency(code)}
                                    className={cn(
                                        "px-1.5 lg:px-2 py-0.5 text-[8px] font-black rounded transition-all",
                                        useStore.getState().currency === code ? "bg-[#1E3A5F] text-brand-accent" : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {code}
                                </button>
                            ))}
                        </div>

                        <div className="h-4 w-px bg-white/5" />

                        {/* EpochIndicator — full on lg+, compact badge on md */}
                        <div className="hidden lg:block">
                            <EpochIndicator />
                        </div>
                        {/* Compact epoch — md only */}
                        <div className="flex lg:hidden items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                                {useStore.getState().currentEpoch ? `E${useStore.getState().currentEpoch.epochId}` : 'SYNC'}
                            </span>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setNotifOpen(!isNotifOpen)}
                                className="relative p-1.5 rounded text-slate-500 hover:text-white transition-all"
                            >
                                <Bell size={16} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                                )}
                            </button>
                        </div>

                        {user && (
                            <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-white/5">
                                <div className="hidden lg:block text-right text-[9px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-2 justify-end">
                                        <span className="text-slate-500">{user.displayName || 'Oracle'}</span>
                                        <TierBadge tier={tier || 'bronze'} size="sm" showLabel={false} />
                                    </div>
                                    <div className={cn("italic", isDemoMode ? "text-amber-400" : "text-emerald-400")}>
                                        {isDemoMode ? `★${demoBalance.toLocaleString()}` : (currency === 'USD' ? `★${formatValue(balance).replace('$', '')}` : formatValue(balance))}
                                    </div>
                                </div>
                                {/* Compact balance for md — no name */}
                                <span className={cn("lg:hidden text-[10px] font-mono font-bold italic whitespace-nowrap", isDemoMode ? "text-amber-400" : "text-emerald-400")}>
                                    {isDemoMode ? `★${demoBalance.toLocaleString()}` : (currency === 'USD' ? `★${formatValue(balance).replace('$', '')}` : formatValue(balance))}
                                </span>
                                <button
                                    onClick={() => navigate('/portfolio')}
                                    className="w-8 h-8 rounded border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] overflow-hidden bg-slate-900 hover:border-brand-accent transition-colors shrink-0"
                                >
                                    {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={14} />}
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-transparent relative">
                    <Outlet />
                    <Footer />
                </div>

                <BottomNav />
            </main>

            <DepositModal isOpen={isDepositOpen} onClose={() => setDepositOpen(false)} />
            <VotePackModal isOpen={isVotePackModalOpen} onClose={() => setVotePackModalOpen(false)} />
            <WithdrawalModal isOpen={isWithdrawalOpen} onClose={() => setWithdrawalOpen(false)} />
            
            {/* Onboarding & Demo Overlays */}
            <GlobalSearch open={isSearchOpen} onClose={() => setSearchOpen(false)} />
            <OnboardingTour />
            <DemoConversionModal />
            
            {/* Global Notifications Panel */}
            <NotificationsPanel isOpen={isNotifOpen} onClose={() => setNotifOpen(false)} />
        </div>
    );
}

export default MainLayout;
