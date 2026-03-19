import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/storeModel';
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
    Loader2,
    CheckCircle,
    RefreshCw,
    KeyRound,
    Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { API_URL } from '../lib/api';

export function SignInPage() {
    const { login, loginWithEmail, user } = useStore();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showReset, setShowReset] = useState(false);

    React.useEffect(() => {
        if (user) navigate('/markets');
    }, [user, navigate]);

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await loginWithEmail(email, password);
            navigate('/markets');
        } catch (err) {
            // Provide user-friendly error messages
            const errorMap = {
                'auth/user-not-found': 'No account found with this email.',
                'auth/wrong-password': 'Incorrect password. Try again.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/too-many-requests': 'Too many attempts. Please try again later.',
                'auth/invalid-credential': 'Invalid credentials. Please check your email and password.'
            };
            setError(errorMap[err.code] || err.message || 'Authentication failed.');
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
            {showReset ? (
                <PasswordResetForm onBack={() => setShowReset(false)} />
            ) : (
                <>
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

                    <button
                        onClick={() => setShowReset(true)}
                        className="w-full text-center text-[10px] text-slate-500 font-bold pt-4 hover:text-brand-accent transition-colors"
                    >
                        Forgot passphrase?
                    </button>

                    <div className="relative py-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-slate-900 px-4 text-slate-600">Cross-Link ID</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <SocialAuthButton onClick={login} icon={<Chrome size={18} />} label="Google" />
                        <SocialAuthButton onClick={() => toast.error("Phone Login requires Firebase Console configuration. This is a UI preview.")} icon={<Phone size={18} />} label="Phone" />
                    </div>

                    <p className="text-center text-[10px] text-slate-500 font-bold uppercase pt-6">
                        New identity required? <button onClick={() => navigate('/signup')} className="text-brand-accent hover:underline">Establish Oracle</button>
                    </p>
                </>
            )}
        </AuthShell>
    );
}

function PasswordResetForm({ onBack }) {
    const { resetPassword } = useStore();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err) {
            const errorMap = {
                'auth/user-not-found': 'No account found with this email.',
                'auth/invalid-email': 'Please enter a valid email address.'
            };
            setError(errorMap[err.code] || err.message || 'Failed to send reset email.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white uppercase mb-2">Reset Link Transmitted</h3>
                    <p className="text-[10px] text-slate-500 font-bold tracking-widest">
                        Check your inbox for recovery instructions.
                    </p>
                </div>
                <button
                    onClick={onBack}
                    className="text-[10px] font-black text-brand-accent uppercase hover:underline"
                >
                    Return to Sign In
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleReset} className="space-y-4">
            <div className="text-center mb-6">
                <KeyRound size={32} className="mx-auto text-brand-accent mb-4" />
                <p className="text-[10px] text-slate-500 font-bold tracking-widest">
                    Enter your email to receive a password reset link.
                </p>
            </div>

            <InputGroup
                type="email"
                placeholder="ORACLE_EMAIL@DOMAIN.COM"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={16} />}
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
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Send Reset Link <ArrowRight size={16} /></>}
            </button>

            <button
                type="button"
                onClick={onBack}
                className="w-full text-center text-[10px] text-slate-500 font-bold uppercase pt-2 hover:text-white transition-colors"
            >
                Back to Sign In
            </button>
        </form>
    );
}

export function SignUpPage() {
    const { registerWithEmail, user } = useStore();
    const navigate = useNavigate();

    const [inviteCode, setInviteCode] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            sessionStorage.setItem('starranker_ref', ref);
        }
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        // Client-side validation
        if (!inviteCode.trim()) {
            setError('Beta invite code is required.');
            return;
        }
        if (password.length < 6) {
            setError('Passphrase must be at least 6 characters.');
            return;
        }
        if (!username.trim()) {
            setError('Oracle handle is required.');
            return;
        }
        if (!phoneNumber.trim()) {
            setError('Secure phone link is required.');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Validate Invite Code
            const validateRes = await fetch(`${API_URL}/api/auth/validate-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: inviteCode })
            });
            const validateData = await validateRes.json();

            if (!validateRes.ok || !validateData.valid) {
                setError(validateData.message || 'Invalid or used invite code.');
                setIsLoading(false);
                return;
            }

            // 2. Register with Firebase
            await registerWithEmail(email, password, username, phoneNumber);

            // 3. Redeem Invite Code
            const { apiPost } = await import('../lib/api.js');
            await apiPost('/api/auth/redeem-invite', { code: inviteCode });

            toast.success("Identity established! Welcome to the network.");
            navigate('/markets');
        } catch (err) {
            const errorMap = {
                'auth/email-already-in-use': 'This email is already registered. Try signing in.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/weak-password': 'Passphrase is too weak. Use at least 6 characters.'
            };
            setError(errorMap[err?.code] || err?.message || 'Registration failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            title="Establish Identity"
            subtitle="Universal Email Access — No Gmail required"
            icon={<UserPlus size={24} />}
        >
            <form onSubmit={handleRegister} className="space-y-4">
                <InputGroup
                    type="text"
                    placeholder="BETA_INVITE_CODE"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    icon={<KeyRound size={16} />}
                />
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
                    type="tel"
                    placeholder="SECURE_PHONE (+1...)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    icon={<Phone size={16} />}
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

            <p className="text-center text-[10px] text-slate-500 font-bold pt-8">
                Existing identity? <button onClick={() => navigate('/signin')} className="text-brand-accent hover:underline">Sign In</button>
            </p>
        </AuthShell>
    );
}

export function EmailVerificationPrompt({ onContinue }) {
    const { sendVerificationEmail, refreshUser, emailVerified } = useStore();
    const [isResending, setIsResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const handleResend = async () => {
        setIsResending(true);
        try {
            await sendVerificationEmail();
            setResent(true);
            setTimeout(() => setResent(false), 5000);
        } catch (err) {
            console.error('Failed to resend verification:', err);
        } finally {
            setIsResending(false);
        }
    };

    const handleCheckVerification = async () => {
        setIsChecking(true);
        try {
            await refreshUser();
        } finally {
            setIsChecking(false);
        }
    };

    if (emailVerified) {
        return (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white uppercase mb-2">Identity Verified</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        Your Oracle credentials have been authenticated.
                    </p>
                </div>
                <button
                    onClick={onContinue}
                    className="w-full py-4 rounded-2xl bg-brand-accent text-slate-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all"
                >
                    Enter Console
                </button>
            </div>
        );
    }

    return (
        <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                <Mail size={32} className="text-amber-500" />
            </div>
            <div>
                <h3 className="text-lg font-black text-white uppercase mb-2">Verification Required</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    A verification link has been transmitted to your email.<br />
                    Click the link to activate your Oracle identity.
                </p>
            </div>

            <div className="space-y-3">
                <button
                    onClick={handleCheckVerification}
                    disabled={isChecking}
                    className="w-full py-4 rounded-2xl bg-brand-accent text-slate-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-3"
                >
                    {isChecking ? <Loader2 size={18} className="animate-spin" /> : <><RefreshCw size={16} /> I've Verified</>}
                </button>

                <button
                    onClick={handleResend}
                    disabled={isResending || resent}
                    className={cn(
                        "w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                        resent
                            ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                            : "border-slate-800 text-slate-500 hover:text-white hover:border-slate-700"
                    )}
                >
                    {isResending ? <Loader2 size={14} className="animate-spin" /> : resent ? <><CheckCircle size={14} /> Link Resent</> : 'Resend Verification Link'}
                </button>
            </div>

            <button
                onClick={onContinue}
                className="text-[10px] text-slate-600 font-bold uppercase hover:text-slate-400 transition-colors"
            >
                Continue without verification (limited access)
            </button>
        </div>
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

                <div className="text-center mb-12 relative z-10">
                    <img src="/assets/logo-horizontal.png" alt="Star Ranker" className="h-32 w-auto mx-auto mb-12 drop-shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform duration-500" />
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

function SocialAuthButton({ onClick, icon, label, disabled = false }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]",
                disabled
                    ? "bg-slate-900/50 border-slate-900 text-slate-700 cursor-not-allowed"
                    : "bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
        >
            {icon}
            {label}
        </button>
    );
}
