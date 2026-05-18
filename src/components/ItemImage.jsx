import { useState, useMemo } from 'react';

/**
 * ItemImage — robust market-item avatar.
 *
 * Fallback chain:
 *   1. Provided src (with onError handling)
 *   2. Google s2 favicon by guessed domain
 *   3. Letter avatar — first character of name on a deterministic color
 *
 * Lazy-loaded, async-decoded, never shows a broken-image icon.
 *
 * Props:
 *   src       : preferred URL (string | null/undefined)
 *   name      : item display name (used for favicon guess + letter avatar + alt)
 *   size      : px (default 40)
 *   rounded   : tailwind rounded class (default 'rounded-xl')
 *   className : extra wrapper classes
 */

const LETTER_PALETTE = [
    { bg: '#1E293B', fg: '#FCD34D' }, // amber on slate
    { bg: '#0F172A', fg: '#22D3EE' }, // cyan on dark
    { bg: '#1E1B4B', fg: '#A78BFA' }, // violet on indigo
    { bg: '#064E3B', fg: '#34D399' }, // emerald
    { bg: '#7F1D1D', fg: '#FCA5A5' }, // rose
    { bg: '#78350F', fg: '#FDBA74' }, // orange
    { bg: '#164E63', fg: '#67E8F9' }, // sky
    { bg: '#3B0764', fg: '#D8B4FE' }, // purple
    { bg: '#365314', fg: '#BEF264' }, // lime
    { bg: '#581C87', fg: '#F0ABFC' }, // fuchsia
];

function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function pickPalette(name) {
    if (!name) return LETTER_PALETTE[0];
    return LETTER_PALETTE[hashStr(name) % LETTER_PALETTE.length];
}

function getInitial(name) {
    if (!name) return '?';
    // Pick the first alphanumeric character we find — supports unicode latin range
    const m = String(name).trim().match(/[A-Za-z0-9]/);
    return (m ? m[0] : String(name)[0] || '?').toUpperCase();
}

export default function ItemImage({ src, name = '', size = 40, rounded = 'rounded-xl', className = '' }) {
    const [stage, setStage] = useState('primary'); // primary | favicon | letter

    const cleanedDomain = useMemo(() => {
        const cleaned = (name || '')
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9 ]/g, '')
            .replace(/\b(inc|llc|corp|corporation|company|co|ltd|limited|the)\b/g, '')
            .trim()
            .replace(/\s+/g, '');
        return cleaned || null;
    }, [name]);

    const faviconUrl = cleanedDomain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanedDomain + '.com')}&sz=128` : null;

    const wrapperStyle = { width: size, height: size };
    const { bg, fg } = pickPalette(name);
    const initial = getInitial(name);

    let imgSrc = null;
    if (stage === 'primary' && src) imgSrc = src;
    else if (stage === 'favicon' && faviconUrl) imgSrc = faviconUrl;

    return (
        <div
            style={{ ...wrapperStyle, ...(imgSrc ? {} : { background: bg }) }}
            className={`${imgSrc ? 'bg-slate-950' : ''} border border-slate-800 ${rounded} flex items-center justify-center overflow-hidden relative shrink-0 ${className}`}
            aria-label={name || ''}
        >
            {imgSrc ? (
                <img
                    src={imgSrc}
                    alt={name || ''}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-90"
                    onError={() => setStage((s) => (s === 'primary' ? 'favicon' : 'letter'))}
                />
            ) : (
                <span
                    aria-hidden="true"
                    style={{ color: fg, fontSize: Math.round(size * 0.46), fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
                >
                    {initial}
                </span>
            )}
        </div>
    );
}
