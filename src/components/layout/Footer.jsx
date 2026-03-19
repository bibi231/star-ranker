import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Twitter, Github, Mail, Shield, Zap, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Footer() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#0D1B2A]/50 border-t border-white/5 pt-16 pb-8 px-8 mt-auto">
            <div className="max-w-[1440px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand Section */}
                    <div className="md:col-span-1 space-y-6">
                        <img src="/assets/logo.png" alt="Star Ranker" className="h-20 w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                        <p className="text-slate-500 text-[11px] leading-relaxed font-medium uppercase tracking-wider">
                            The definitive server-authoritative ranking protocol.
                            Built for the next generation of predictive markets.
                        </p>
                        <div className="flex gap-4">
                            <SocialIcon icon={<Twitter size={16} />} href="https://twitter.com/starranker" />
                            <SocialIcon icon={<Github size={16} />} href="https://github.com/starranker" />
                            <SocialIcon icon={<Mail size={16} />} href="mailto:ops@starranker.market" />
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Ecosystem</h4>
                        <ul className="space-y-3">
                            <FooterLink label="Markets" onClick={() => navigate('/markets')} />
                            <FooterLink label="Leaderboard" onClick={() => navigate('/leaderboards')} />
                            <FooterLink label="Activity" onClick={() => navigate('/activity')} />
                            <FooterLink label="History" onClick={() => navigate('/history')} />
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Resources</h4>
                        <ul className="space-y-3">
                            <FooterLink label="How it Works" onClick={() => navigate('/how-it-works')} />
                            <FooterLink label="Transparency" onClick={() => navigate('/transparency')} />
                            <FooterLink label="API Documentation" onClick={() => navigate('/api-docs')} />
                            <FooterLink label="Beta FAQ" onClick={() => navigate('/faq')} />
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Governance</h4>
                        <ul className="space-y-3">
                            <FooterLink label="Terms of Service" onClick={() => navigate('/legal/terms')} />
                            <FooterLink label="Privacy Policy" onClick={() => navigate('/legal/privacy')} />
                            <FooterLink label="Responsible Play" onClick={() => navigate('/legal/responsible-play')} />
                            <FooterLink label="AVD Compliance" onClick={() => navigate('/legal/avd-compliance')} />
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em]">
                        © {currentYear} STAR RANKER PROTOCOL. ALL RIGHTS RESERVED.
                    </p>
                    <div className="flex items-center gap-6 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        <span className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            NETWORK STATUS: OPERATIONAL
                        </span>
                        <span className="opacity-40">BETA 2.0.48</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ label, onClick }) {
    return (
        <li>
            <button
                onClick={onClick}
                className="text-[10px] font-bold text-slate-500 hover:text-brand-accent uppercase tracking-widest transition-colors flex items-center gap-2 group"
            >
                <div className="w-1 h-[1px] bg-slate-800 group-hover:bg-brand-accent group-hover:w-2 transition-all" />
                {label}
            </button>
        </li>
    );
}

function SocialIcon({ icon, href }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:border-brand-accent/50 transition-all"
        >
            {icon}
        </a>
    );
}

export default Footer;
