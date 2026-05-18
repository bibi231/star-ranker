import { useEffect, useState, useCallback } from 'react';

const KEY = 'sr.theme'; // 'dark' | 'light' | 'system'

function readPref() {
    try {
        const v = localStorage.getItem(KEY);
        if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch (_) {}
    return 'system';
}

function resolveActual(pref) {
    if (pref === 'system') {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        return 'light';
    }
    return pref;
}

function applyTheme(actual) {
    const root = document.documentElement;
    if (actual === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
    } else {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
    }
    // Update theme-color meta for browser chrome
    let meta = document.head.querySelector('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', actual === 'light' ? '#FAFAF9' : '#0B0F1E');
}

export function useTheme() {
    const [pref, setPref] = useState(readPref);
    const [actual, setActual] = useState(() => resolveActual(readPref()));

    const setPreference = useCallback((next) => {
        setPref(next);
        try { localStorage.setItem(KEY, next); } catch (_) {}
        const a = resolveActual(next);
        setActual(a);
        applyTheme(a);
    }, []);

    const toggle = useCallback(() => {
        setPreference(actual === 'light' ? 'dark' : 'light');
    }, [actual, setPreference]);

    useEffect(() => {
        applyTheme(actual);
        if (pref !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const onChange = () => {
            const a = mq.matches ? 'light' : 'dark';
            setActual(a);
            applyTheme(a);
        };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [pref, actual]);

    return { theme: actual, preference: pref, setPreference, toggle, isLight: actual === 'light', isDark: actual === 'dark' };
}

// One-shot init for use before React mounts (prevents FOUC)
export function bootstrapTheme() {
    try {
        const pref = readPref();
        applyTheme(resolveActual(pref));
    } catch (_) {}
}
