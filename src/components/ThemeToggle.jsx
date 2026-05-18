import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ compact = false, className = '' }) {
    const { preference, setPreference, isLight } = useTheme();
    if (compact) {
        return (
            <button
                type="button"
                onClick={() => setPreference(isLight ? 'dark' : 'light')}
                aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
                title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
                className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-amber-400 ${className}`}
            >
                {isLight ? <Moon size={18} /> : <Sun size={18} />}
            </button>
        );
    }
    const opts = [
        { id: 'light',  label: 'Light',  Icon: Sun },
        { id: 'system', label: 'System', Icon: Monitor },
        { id: 'dark',   label: 'Dark',   Icon: Moon },
    ];
    return (
        <div className={`inline-flex gap-1 p-1 bg-slate-950/60 border border-white/10 rounded-2xl ${className}`}>
            {opts.map(({ id, label, Icon }) => {
                const active = preference === id;
                return (
                    <button
                        key={id}
                        onClick={() => setPreference(id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                            active ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        aria-pressed={active}
                    >
                        <Icon size={14} /> {label}
                    </button>
                );
            })}
        </div>
    );
}
