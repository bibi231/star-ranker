/**
 * API client wrapper — attaches Firebase Auth token to all requests.
 * Includes: 10s timeout, 2x retry with exponential backoff, sessionStorage cache
 */

import { auth } from "../firebase";

// Forced production domains
const isProductionHost = typeof window !== 'undefined' &&
    (window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('starranker.io') ||
        window.location.hostname.includes('web.app'));

// Override via Vite env (Vercel project env) if the API host changes
const envApi = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL;

// Absolute priority to Render if on production host
export const API_URL = envApi && String(envApi).trim()
    ? String(envApi).trim().replace(/\/$/, "")
    : (typeof window !== 'undefined' && window.location.hostname === 'localhost')
        ? "http://localhost:3001"
        : (isProductionHost ? "https://star-ranker.onrender.com" : "http://localhost:3001");

async function getAuthHeaders() {
    const user = auth.currentUser;
    if (!user) return {};
    try {
        const token = await user.getIdToken();
        return { Authorization: `Bearer ${token}` };
    } catch {
        return {};
    }
}

/**
 * Fetch with timeout (AbortController) + retry
 * @param {object} [fetchConfig] - { retries, backoff, timeoutMs }
 */
async function fetchWithRetry(url, options = {}, fetchConfig = {}) {
    const retries = fetchConfig.retries ?? 2;
    const backoff = fetchConfig.backoff ?? 500;
    const timeoutMs = fetchConfig.timeoutMs ?? 10000;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) {
                if (res.status === 429) {
                    throw new Error("Rate limit exceeded. Please wait a moment.");
                }
                const error = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(error.error || `API error: ${res.status}`);
            }
            return res.json();
        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                throw new Error(`Request timed out (${Math.round(timeoutMs / 1000)}s)`);
            }

            // Stop retrying if rate limited
            if (err.message === "Rate limit exceeded. Please wait a moment.") {
                throw err;
            }

            if (attempt < retries) {
                const delay = backoff * Math.pow(2, attempt);
                console.warn(`[API] Retry ${attempt + 1}/${retries} in ${delay}ms:`, err.message);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw err;
        }
    }
}

/**
 * SessionStorage cache for categories (5 minute TTL)
 */
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
    try {
        const raw = sessionStorage.getItem(`sr_cache_${key}`);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) {
            sessionStorage.removeItem(`sr_cache_${key}`);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function setCache(key, data) {
    try {
        sessionStorage.setItem(`sr_cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* ignore quota errors */ }
}

/** Clear cached categories (e.g. after empty response was cached or API URL changed). */
export function clearCategoriesCache() {
    try {
        sessionStorage.removeItem("sr_cache_categories");
    } catch { /* ignore */ }
}

export async function apiGet(path, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_URL}${path}${queryString ? `?${queryString}` : ""}`;

    // Check cache for categories (never use cached empty list — it hides real data after fixes)
    if (path === "/api/categories" && !queryString) {
        const cached = getCached("categories");
        if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    }

    const headers = await getAuthHeaders();

    const data = await fetchWithRetry(url, {
        headers: { ...headers, "Content-Type": "application/json" },
    });

    // Cache categories only when non-empty
    if (path === "/api/categories" && !queryString && Array.isArray(data) && data.length > 0) {
        setCache("categories", data);
    }

    return data;
}

/**
 * @param {object} [opts] - { timeoutMs, retries } — use long timeout for slow admin jobs (e.g. seed)
 */
export async function apiPost(path, body = {}, opts = {}) {
    const headers = await getAuthHeaders();
    const timeoutMs = opts.timeoutMs ?? 10000;
    const retries = opts.retries ?? 1;

    return fetchWithRetry(`${API_URL}${path}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }, { retries, timeoutMs });
}

export async function apiPatch(path, body = {}) {
    const headers = await getAuthHeaders();

    return fetchWithRetry(`${API_URL}${path}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }, { retries: 1, timeoutMs: 10000 });
}
