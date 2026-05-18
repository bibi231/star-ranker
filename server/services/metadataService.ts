import { db } from '../db/index.js';
import { items } from '../db/schema.js';
import { eq, isNull } from 'drizzle-orm';

const FETCH_TIMEOUT_MS = 4000;

async function timedFetch(url: string, init?: RequestInit): Promise<Response | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const r = await fetch(url, { ...init, signal: ctrl.signal, headers: { 'User-Agent': 'StarRanker-MetadataBot/1.0 (+https://star-ranker.vercel.app)', ...(init?.headers || {}) } });
        return r.ok ? r : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

let coinListCache: Array<{ id: string; symbol: string; name: string }> | null = null;
let coinListCachedAt = 0;
const COIN_LIST_TTL = 6 * 60 * 60 * 1000;

async function getCoinList() {
    if (coinListCache && Date.now() - coinListCachedAt < COIN_LIST_TTL) return coinListCache;
    const res = await timedFetch('https://api.coingecko.com/api/v3/coins/list');
    if (!res) return coinListCache || [];
    const json = (await res.json()) as Array<{ id: string; symbol: string; name: string }>;
    coinListCache = json;
    coinListCachedAt = Date.now();
    return json;
}

async function tryCoinGecko(name: string): Promise<string | null> {
    const list = await getCoinList();
    const lower = name.toLowerCase();
    const fuzzy = list.find(c => c.name.toLowerCase() === lower || c.symbol.toLowerCase() === lower)
              || list.find(c => c.name.toLowerCase().startsWith(lower));
    if (!fuzzy) return null;
    const res = await timedFetch(`https://api.coingecko.com/api/v3/coins/${fuzzy.id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`);
    if (!res) return null;
    const data = await res.json();
    return data?.image?.large || data?.image?.small || null;
}

async function tryWikipedia(name: string): Promise<string | null> {
    const slug = encodeURIComponent(name.trim().replace(/\s+/g, '_'));
    const res = await timedFetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`);
    if (!res) return null;
    const data = await res.json();
    return data?.originalimage?.source || data?.thumbnail?.source || null;
}

function nameToDomain(name: string): string {
    return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9 ]/g, '').replace(/\b(inc|llc|corp|corporation|company|co|ltd|limited|the)\b/g, '').trim().replace(/\s+/g, '') + '.com';
}

async function tryClearbit(name: string): Promise<string | null> {
    const url = `https://logo.clearbit.com/${nameToDomain(name)}?size=256`;
    const res = await timedFetch(url);
    if (!res) return null;
    return (res.headers.get('content-type') || '').startsWith('image/') ? url : null;
}

function googleFavicon(name: string): string {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(nameToDomain(name))}&sz=128`;
}

async function resolveImage(name: string, category: string): Promise<{ imageUrl: string; source: string } | null> {
    const cat = (category || '').toLowerCase();
    if (['crypto', 'token', 'tokens', 'coins'].includes(cat)) {
        const u = await tryCoinGecko(name);
        if (u) return { imageUrl: u, source: 'coingecko' };
    }
    const wiki = await tryWikipedia(name);
    if (wiki) return { imageUrl: wiki, source: 'wikipedia' };
    const cb = await tryClearbit(name);
    if (cb) return { imageUrl: cb, source: 'clearbit' };
    return { imageUrl: googleFavicon(name), source: 'google_favicon' };
}

export class MetadataService {
    private static instance: MetadataService;
    private running = false;
    private constructor() {}

    public static getInstance(): MetadataService {
        if (!MetadataService.instance) MetadataService.instance = new MetadataService();
        return MetadataService.instance;
    }

    public async refreshAllMissingMetadata(opts?: { force?: boolean; batchSize?: number }) {
        if (this.running) { console.log('[MetadataService] Already running, skip'); return; }
        this.running = true;
        const batchSize = opts?.batchSize ?? 50;
        const force = opts?.force ?? false;
        try {
            console.log('[MetadataService] Scanning for items needing imagery...');
            const pending = force
                ? await db.select().from(items).limit(batchSize)
                : await db.select().from(items).where(isNull(items.imageUrl)).limit(batchSize);
            console.log(`[MetadataService] ${pending.length} item(s) to enrich`);
            let ok = 0, fail = 0;
            for (const item of pending) {
                try {
                    const resolved = await resolveImage(item.name, (item as any).category || 'general');
                    if (resolved) {
                        await db.update(items).set({ imageUrl: resolved.imageUrl } as any).where(eq(items.id, item.id));
                        ok++;
                        console.log(`[MetadataService] ${item.name} <- ${resolved.source}`);
                    } else { fail++; }
                } catch (err) {
                    fail++;
                    console.error(`[MetadataService] Resolve failed for ${item.name}:`, err);
                }
                await new Promise(r => setTimeout(r, 250));
            }
            console.log(`[MetadataService] Done. ${ok} updated, ${fail} failed.`);
        } finally {
            this.running = false;
        }
    }

    public async resolveOne(name: string, category: string): Promise<string | null> {
        const r = await resolveImage(name, category);
        return r?.imageUrl || null;
    }
}
