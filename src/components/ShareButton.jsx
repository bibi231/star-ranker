import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareButton({ title = 'Star Ranker', text = '', url, className = '' }) {
    const [copied, setCopied] = useState(false);
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    const handleShare = async () => {
        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({ title, text, url: shareUrl });
                return;
            }
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Link copied');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            if (err?.name !== 'AbortError') toast.error('Could not share');
        }
    };

    return (
        <button
            type="button"
            onClick={handleShare}
            className={`min-h-[40px] px-3 flex items-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-[10px] font-black uppercase tracking-widest text-slate-300 ${className}`}
            aria-label="Share this market"
        >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            {copied ? 'Copied' : 'Share'}
        </button>
    );
}
