import { useState, useMemo } from 'react';
import { Star } from 'lucide-react';

/**
 * ItemImage — robust market-item avatar.
 * - Lazy-loads (loading="lazy", decoding="async")
 * - Falls back through: provided src → Google s2 favicon → Star icon
 * - Never shows a broken-image icon
 *
 * Props:
 *   src       : preferred URL (string | null/undefined)
 *   name      : item display name (used for favicon-fallback domain guess + alt)
 *   size      : px (default 40)
 *   rounded   : tailwind rounded class (default 'rounded-xl')
 *   className : extra wrapper classes
 */
export default function ItemImage({ src, name = '', size = 40, rounded = 'rounded-xl', className = '' }) {
    const [stage, setStage] = useState('primary'); // primary | fallback | icon

    const fallbackUrl = useMemo(() => {
        const cleaned = (name || '')
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9 ]/g, '')
            .replace(/\b(inc|llc|corp|corporation|company|co|ltd|limited|the)\b/g, '')
            .trim()
            .replace(/\s+/g, '');
        if (!cleaned) return null;
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleaned + '.com')}&sz=128`;
    }, [name]);

    const wrapperStyle = { width: size, height: size };

    let imgSrc = null;
    if (stage === 'primary' && src) imgSrc = src;
    else if (stage === 'fallback' && fallbackUrl) imgSrc = fallbackUrl;

    return (
        <div
            style={wrapperStyle}
            className={`bg-slate-950 border border-slate-800 ${rounded} flex items-center justify-center overflow-hidden relative shrink-0 ${className}`}
        >
            {imgSrc ? (
                <img
                    src={imgSrc}
                    alt={name || ''}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-90"
                    onError={() => setStage((s) => (s === 'primary' ? 'fallback' : 'icon'))}
                />
            ) : (
                <Star size={Math.round(size * 0.4)} className="text-slate-700" aria-hidden="true" />
            )}
        </div>
    );
}
