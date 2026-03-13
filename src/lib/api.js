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

// Absolute priority to Render if on production host
export const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    ? (import.meta.env.VITE_API_URL || "http://localhost:3001")
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
 */
async function fetchWithRetry(url, options = {}, retries = 2, backoff = 500) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
                err.message = 'Request timed out (10s)';
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

export async function apiGet(path, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_URL}${path}${queryString ? `?${queryString}` : ""}`;

    // Check cache for categories
    if (path === "/api/categories" && !queryString) {
        const cached = getCached("categories");
        if (cached) return cached;
    }

    const headers = await getAuthHeaders();

    const data = await fetchWithRetry(url, {
        headers: { ...headers, "Content-Type": "application/json" },
    });

    // Cache categories
    if (path === "/api/categories" && !queryString) {
        setCache("categories", data);
    }

    return data;
}

export async function apiPost(path, body = {}) {
    const headers = await getAuthHeaders();

    return fetchWithRetry(`${API_URL}${path}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }, 1); // Only 1 retry for mutations
}
