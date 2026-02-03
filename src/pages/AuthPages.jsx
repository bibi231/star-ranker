import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import {
    Zap,
    Mail,
    Github,
    Chrome,
    Lock,
    UserPlus,
    ArrowRight,
    Fingerprint,
    ShieldCheck,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';

export function SignInPage() {
    const { login, loginWithEmail, user } = useStore();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await loginWithEmail(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            title="Secure Terminal Entry"
            subtitle="Access the Oracle Market Engine"
            icon={<Lock size={24} />}
        >
            <form onSubmit={handleEmailLogin} className="space-y-4">
                <InputGroup
                    type="email"
                    placeholder="ORACLE_EMAIL@DOMAIN.COM"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail size={16} />}
                />
                <InputGroup
                    type="password"
                    placeholder="SECURITY_PASSPHRASE"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Fingerprint size={16} />}
                />

                {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black flex items-center gap-2 uppercase">
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-2xl bg-brand-accent text-slate-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-accent/20 flex items-center justify-center gap-3"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Enter Terminal <ArrowRight size={16} /></>}
                </button>
            </form>

            <div className="relative py-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-slate-900 px-4 text-slate-600">Cross-Link ID</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <SocialAuthButton onClick={login} icon={<Chrome size={18} />} label="Google" />
                <SocialAuthButton onClick={() => { }} icon={<Github size={18} />} label="GitHub" />
            </div>

            <p className="text-center text-[10px] text-slate-500 font-bold uppercase pt-6">
                New identity required? <button onClick={() => navigate('/signup')} className="text-brand-accent hover:underline">Establish Oracle</button>
            </p>
        </AuthShell>
    );
}

export function SignUpPage() {
    const { registerWithEmail, user } = useStore();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await registerWithEmail(email, password, username);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Registration failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            title="Establish Identity"
            subtitle="Join the Global Ranking Network"
            icon={<UserPlus size={24} />}
        >
            <form onSubmit={handleRegister} className="space-y-4">
                <InputGroup
                    type="text"
                    placeholder="ORACLE_HANDLE"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    icon={<ShieldCheck size={16} />}
                />
                <InputGroup
                    type="email"
                    placeholder="NETWORK_EMAIL"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail size={16} />}
                />
                <InputGroup
                    type="password"
                    placeholder="PASSPHRASE_MIN_6"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Fingerprint size={16} />}
                />

                {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black flex items-center gap-2 uppercase">
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-brand-accent hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-white/10 flex items-center justify-center gap-3"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Initiate Archive <ArrowRight size={16} /></>}
                </button>
            </form>

            <p className="text-center text-[10px] text-slate-500 font-bold uppercase pt-8">
                Existing identity? <button onClick={() => navigate('/signin')} className="text-brand-accent hover:underline">Sign In</button>
            </p>
        </AuthShell>
    );
}

function AuthShell({ children, title, subtitle, icon }) {
    return (
        <div className="min-h-[90vh] flex items-center justify-center p-6 bg-[#020617]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-10 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-3xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-[80px]" />

                <div className="text-center mb-10 relative z-10">
                    <div className="w-14 h-14 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent mx-auto mb-6 shadow-xl shadow-brand-accent/5">
                        {icon}
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{title}</h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">{subtitle}</p>
                </div>

                <div className="relative z-10">
                    {children}
                </div>
            </motion.div>
        </div>
    );
}

function InputGroup({ icon, ...props }) {
    return (
        <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
                {icon}
            </span>
            <input
                {...props}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs font-black uppercase text-white placeholder-slate-700 transition-all focus:ring-1 focus:ring-brand-accent focus:outline-none"
            />
        </div>
    );
}

function SocialAuthButton({ onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white transition-all active:scale-[0.98]"
        >
            {icon}
            {label}
        </button>
    );
}
