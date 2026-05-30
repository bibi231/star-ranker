import { useEffect, useState } from 'react';
import { API_URL } from '../lib/api';

/**
 * RenderWakeup — guards first paint against Render free-tier cold starts.
 *
 * The API sleeps after 15 min idle; a cold start takes 30-50s. UptimeRobot
 * pings every 5 min so it is almost always warm, but a fresh page load still
 * has to confirm that before firing real API calls.
 *
 * Behaviour:
 *  - If we confirmed the API was warm in the last WARM_TTL ms, render children
 *    immediately with NO splash (the common case — every normal reload).
 *  - Otherwise ping /api/health. Only reveal the splash if the ping is still
 *    pending after GRACE_MS, and only show the alarming "Waking…" copy after a
 *    real failed attempt — a merely slow-but-successful ping never flashes it.
 *  - On any 200 we cache warmth so subsequent reloads are instant.
 */
const WARM_KEY = 'sr_api_warm_until';
const WARM_TTL = 10 * 60 * 1000; // 10 min — comfortably inside the 15-min sleep window
const GRACE_MS = 2500;           // don't show anything for the first 2.5s
const DEADLINE = 45_000;

function warmCached() {
    try {
        const until = Number(localStorage.getItem(WARM_KEY) || 0);
        return Date.now() < until;
    } catch { return false; }
}
function markWarm() {
    try { localStorage.setItem(WARM_KEY, String(Date.now() + WARM_TTL)); } catch { /* ignore */ }
}

export default function RenderWakeup({ children }) {
    // If we already know it's warm, skip the gate entirely on this mount.
    const [ready, setReady] = useState(() => warmCached());
    const [waiting, setWaiting] = useState(false);
    const [coldStart, setColdStart] = useState(false);

    useEffect(() => {
        let mounted = true;
        const start = Date.now();

        const ping = async (timeoutMs = 8000) => {
            try {
                const controller = new AbortController();
                const tid = setTimeout(() => controller.abort(), timeoutMs);
                const r = await fetch(`${API_URL}/api/health`, { signal: controller.signal });
                clearTimeout(tid);
                if (r.ok) { markWarm(); return true; }
            } catch { /* offline / cold */ }
            return false;
        };

        // Already known-warm: refresh warmth silently in the background, never block.
        if (ready) {
            ping().catch(() => {});
            return () => { mounted = false; };
        }

        // Reveal the splash only if we're still waiting after the grace window.
        const graceTimer = setTimeout(() => mounted && setWaiting(true), GRACE_MS);

        (async () => {
            if (await ping()) {
                clearTimeout(graceTimer);
                if (mounted) setReady(true);
                return;
            }
            // First attempt failed → it's a genuine cold start. Escalate copy + retry.
            if (mounted) setColdStart(true);
            while (mounted && Date.now() - start < DEADLINE) {
                await new Promise(r => setTimeout(r, 3000));
                if (await ping()) {
                    clearTimeout(graceTimer);
                    if (mounted) setReady(true);
                    return;
                }
            }
            // Deadline hit — let the app load anyway.
            if (mounted) setReady(true);
        })();

        return () => {
            mounted = false;
            clearTimeout(graceTimer);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (ready) return children;
    if (!waiting) return null; // grace window — no flash

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020617] text-slate-200">
            <div className="flex flex-col items-center gap-6 px-8 max-w-md text-center">
                <img src="/assets/logo-stacked.png" alt="Star Ranker" className="h-20 w-auto drop-shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-pulse" />
                <div className="space-y-2">
                    <p className="text-amber-400 text-sm font-black uppercase tracking-[0.25em]">
                        {coldStart ? 'Waking the oracle network… (~30s)' : 'Connecting to oracle…'}
                    </p>
                    {coldStart && (
                        <p className="text-slate-500 text-xs">
                            The API sleeps after 15 minutes of inactivity. This first call usually takes about 30 seconds.
                        </p>
                    )}
                </div>
                <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 animate-pulse" style={{ width: '40%' }} />
                </div>
            </div>
        </div>
    );
}
