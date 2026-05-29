import { useEffect, useState } from 'react';
import { API_URL } from '../lib/api';

/**
 * RenderWakeup — pings /api/health on mount. While the API is asleep on
 * Render free tier (15-min sleep timer), cold-start takes 30-50s.
 * Shows a friendly splash instead of letting the first 20 API calls
 * time out and toast errors at the user.
 *
 * Renders children once: (a) health 200 received, or (b) 45s deadline hit
 * (we let the app load anyway and let users see whatever error toasts).
 */
export default function RenderWakeup({ children }) {
    const [ready, setReady] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [stage, setStage] = useState('Connecting to oracle…');

    useEffect(() => {
        let mounted = true;
        const start = Date.now();
        const deadline = 45_000;

        // Show the splash only if the ping doesn't return in 1.5s
        const slowTimer = setTimeout(() => mounted && setWaiting(true), 1500);

        const ping = async () => {
            try {
                const controller = new AbortController();
                const tid = setTimeout(() => controller.abort(), 8000);
                const r = await fetch(`${API_URL}/api/health`, { signal: controller.signal });
                clearTimeout(tid);
                if (r.ok && mounted) {
                    setReady(true);
                    return true;
                }
            } catch (_) {}
            return false;
        };

        (async () => {
            // First fast attempt
            if (await ping()) { clearTimeout(slowTimer); return; }
            // Otherwise wait and retry every 3s until deadline
            setStage('Waking the oracle network… (first load ~30s)');
            while (mounted && Date.now() - start < deadline) {
                await new Promise(r => setTimeout(r, 3000));
                if (await ping()) { clearTimeout(slowTimer); return; }
            }
            // Deadline hit — render anyway; users will see whatever toasts come
            if (mounted) setReady(true);
        })();

        return () => {
            mounted = false;
            clearTimeout(slowTimer);
        };
    }, []);

    if (ready) return children;
    if (!waiting) return null;  // First 1.5s — no flash

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020617] text-slate-200">
            <div className="flex flex-col items-center gap-6 px-8 max-w-md text-center">
                <img src="/assets/logo-stacked.png" alt="Star Ranker" className="h-20 w-auto drop-shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-pulse" />
                <div className="space-y-2">
                    <p className="text-amber-400 text-sm font-black uppercase tracking-[0.25em]">{stage}</p>
                    <p className="text-slate-500 text-xs">
                        The API is hosted on a free tier and sleeps after 15 minutes of inactivity.
                        This first call usually takes 30 seconds.
                    </p>
                </div>
                <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 animate-pulse" style={{ width: '40%' }} />
                </div>
            </div>
        </div>
    );
}
