import { auth } from "../../firebase";
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile
} from "firebase/auth";
import toast from "react-hot-toast";
import { apiGet, apiPost, clearCategoriesCache } from "../../lib/api";
import { isSuperAdminEmail } from "../../lib/superAdmins.js";

export const createMarketSlice = (set, get) => ({
    syncInterval: null,
    usePowerVote: false,
    items: [],
    categories: [],
    fetchCategories: async () => {
        const fallbackCategories = [
            { id: 1, slug: 'crypto', title: 'Crypto Assets', description: 'Top cryptocurrencies.' },
            { id: 2, slug: 'smartphones', title: 'Smartphones', description: 'Mobile devices.' },
            { id: 3, slug: 'music', title: 'Music Artists', description: 'Top artists.' },
            { id: 4, slug: 'websites', title: 'Websites & Apps', description: 'Top platforms.' },
            { id: 5, slug: 'tech', title: 'Tech Companies', description: 'Leading tech.' },
        ];
        try {
            const data = await apiGet("/api/categories");
            if (data && Array.isArray(data) && data.length > 0) {
                set({ categories: data });
            } else {
                console.warn("[Store] /api/categories returned empty — database may need seeding.");
                const { categories: existing } = get();
                if (existing.length === 0) set({ categories: fallbackCategories });
            }
        } catch (err) {
            console.error("Failed to fetch categories:", err);
            clearCategoriesCache();
            const { categories: existing } = get();
            if (existing.length === 0) set({ categories: fallbackCategories });
        }
    },
    currentCategorySlug: 'crypto',
    isSyncing: false,
    lastRefresh: Date.now(),
    userVotes: {},
    currentEpoch: null,
    serverTimeOffset: 0,
    togglePowerVote: () => set((state) => ({ usePowerVote: !state.usePowerVote })),
    setCategoryItems: async (slug) => {
        const { syncInterval } = get();
        if (syncInterval) clearInterval(syncInterval);
        
        set({ currentCategorySlug: slug, isSyncing: true });
        
        const fetchItems = async () => {
            try {
                const [apiItems, apiSponsors] = await Promise.all([
                    apiGet("/api/items", { category: slug }),
                    apiGet("/api/sponsorships/active", { category: slug }).catch(() => [])
                ]);

                if (apiItems && Array.isArray(apiItems)) {
                    let formattedItems = apiItems.map(item => {
                        const sponsor = apiSponsors.find(s => s.itemId === item.docId);
                        return {
                            id: item.id,
                            docId: item.docId,
                            name: item.name,
                            symbol: item.symbol,
                            score: item.score || 0,
                            rank: item.rank,
                            velocity: item.velocity || 0,
                            momentum: item.momentum || 0,
                            trend: item.trend || [],
                            imageUrl: item.imageUrl,
                            isDampened: item.isDampened,
                            isSponsored: !!sponsor,
                            sponsorLabel: sponsor?.label,
                            totalVotes: item.totalVotes || 0
                        };
                    });
                    
                    // Client-side Sort: Always respect rank first
                    formattedItems.sort((a, b) => (a.isSponsored && !b.isSponsored) ? -1 : ((a.rank || 0) - (b.rank || 0)));
                    set({ items: formattedItems, isSyncing: false, lastRefresh: Date.now() });
                }
            } catch (err) {
                console.error("Sync error:", err);
                set({ isSyncing: false });
            }
        };

        await fetchItems();
        get().startBackgroundSync();
    },
    fetchMovers: async (categoryId, type) => {
        set({ isSyncing: true });
        try {
            const data = await apiGet(`/api/items/movers?categoryId=${categoryId}&type=${type}`);
            if (data && Array.isArray(data)) {
                const formattedItems = data.map(item => ({
                    id: item.docId,
                    name: item.name,
                    symbol: item.symbol,
                    score: item.score || 0,
                    velocity: item.velocity || 0,
                    totalVotes: item.totalVotes || 0,
                    trend: item.trend || Array.from({ length: 15 }, () => Math.random() * 100),
                    imageUrl: item.imageUrl,
                    rank: item.rank || 1,
                    rankChange: item.rankChange || 0,
                    isSponsored: false,
                }));
                if (get().user) {
                    get().fetchUserVotes(categoryId);
                }
                set({ items: formattedItems, isSyncing: false });
            }
        } catch (err) {
            console.error("Movers fetch failed:", err);
            set({ isSyncing: false });
        }
    },
    getFilteredItems: () => {
        const { items, searchQuery } = get();
        let filtered = [...items];
        if (searchQuery) {
            filtered = filtered.filter(i =>
                i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                i.symbol?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return filtered;
    },
    startBackgroundSync: () => {
        if (get().syncInterval) return;
        
        const interval = setInterval(async () => {
            const { user, isDemoMode, currentCategorySlug, fetchUserProfile, setCategoryItems } = get();
            console.log("[Sync] Pulse triggered");
            
            // Priority 1: User Profile (every pulse)
            if (user) await fetchUserProfile();
            
            // Priority 2: Market Data (if on category)
            if (currentCategorySlug) {
                // We reuse the existing fetch logic but without starting a new interval
                const fetchItems = async () => {
                    try {
                        const data = await apiGet("/api/items", { category: currentCategorySlug });
                        if (data?.items) set({ items: data.items, lastRefresh: Date.now() });
                    } catch (e) { console.error("[Sync] Items failed", e); }
                };
                await fetchItems();
            }
            
            // Priority 3: Crypto (if applicable)
            if (get().updateCryptoPrices) await get().updateCryptoPrices();
            
        }, 30000);
        
        set({ syncInterval: interval });
    },
    stopBackgroundSync: () => {
        const { syncInterval } = get();
        if (syncInterval) {
            clearInterval(syncInterval);
            set({ syncInterval: null });
        }
    },
    fetchCurrentEpoch: async () => {
        try {
            const data = await apiGet("/api/epochs/current");
            if (data) {
                const now = Date.now();
                const serverTime = data.serverTime || now;
                const skew = serverTime - now;

                set({
                    currentEpoch: {
                        epochId: data.epochNumber ?? data.epochId ?? data.id ?? 0,
                        startTime: data.startTime,
                        endTime: data.endTime,
                    },
                    serverTimeOffset: skew
                });
            }
        } catch (err) {
            console.error("Failed to fetch current epoch:", err);
            const now = new Date();
            const utcMins = now.getUTCMinutes();
            const start = new Date(now);
            start.setUTCHours(now.getUTCHours(), utcMins < 30 ? 0 : 30, 0, 0);
            const end = new Date(start.getTime() + 30 * 60 * 1000);

            set({
                currentEpoch: {
                    epochId: 0,
                    startTime: start.getTime(),
                    endTime: end.getTime(),
                }
            });
        }
    },
    syncEpoch: (epochData) => {
        if (!epochData) return;
        set({
            currentEpoch: {
                epochId: epochData.epochNumber ?? epochData.epochId ?? 0,
                startTime: epochData.startTime,
                endTime: epochData.endTime,
            }
        });
    },
    refreshCurrentCategory: async () => {
        const { currentCategorySlug, setCategoryItems } = get();
        await setCategoryItems(currentCategorySlug);
    },
    fetchUserVotes: async (slug) => {
        if (!auth.currentUser) return;
        try {
            const votes = await apiGet("/api/votes", { category: slug });
            set({ userVotes: votes || {} });
        } catch (err) {
            console.error("Failed to fetch user votes:", err);
        }
    },
    vote: async (itemId, direction) => {
        const { currentCategorySlug, userVotes, items } = get();

        const previousVotes = { ...userVotes };
        const newVotes = { ...userVotes };
        const currentVote = userVotes[itemId];
        let finalDirection = direction;

        if (direction === 1 && currentVote === 'up') finalDirection = 0;
        else if (direction === -1 && currentVote === 'down') finalDirection = 0;

        if (finalDirection === 1) newVotes[itemId] = 'up';
        else if (finalDirection === -1) newVotes[itemId] = 'down';
        else delete newVotes[itemId];

        // Optimistic UI Update
        set({ userVotes: newVotes });

        // Optimistic Item Update
        const previousItems = [...items];
        const updatedItems = items.map(item => {
            if (item.docId === itemId) {
                const prevDir = currentVote === 'up' ? 1 : currentVote === 'down' ? -1 : 0;
                const scoreDelta = finalDirection - prevDir;
                return { ...item, score: (item.score || 0) + scoreDelta };
            }
            return item;
        });
        
        // Re-sort based on score (simulating real-time rank change)
        updatedItems.sort((a, b) => (b.score || 0) - (a.score || 0));
        set({ items: updatedItems });

        try {
            const response = await apiPost("/api/votes", {
                itemDocId: itemId,
                direction: finalDirection,
                categorySlug: currentCategorySlug,
                usePowerVote: get().usePowerVote
            });
            
            if (response?.newPowerVotes !== undefined) {
                set(state => ({
                    user: { ...state.user, powerVotes: response.newPowerVotes }
                }));
            }
            
            // Re-sync after a short delay to get final server-calculated rank
            setTimeout(() => get().refreshCurrentCategory(), 1000);
            get().fetchUserProfile();
        } catch (error) {
            console.error("Vote error:", error);
            set({ userVotes: previousVotes, items: previousItems });
            toast.error("Network synchronization failed");
        }
    },
    refreshCurrentCategory: async () => {
        const { currentCategorySlug } = get();
        if (!currentCategorySlug) return;
        
        try {
            const [apiItems, apiSponsors] = await Promise.all([
                apiGet("/api/items", { category: currentCategorySlug }),
                apiGet("/api/sponsorships/active", { category: currentCategorySlug }).catch(() => [])
            ]);

            if (apiItems && Array.isArray(apiItems)) {
                let formattedItems = apiItems.map(item => {
                    const sponsor = apiSponsors.find(s => s.itemId === item.docId);
                    return {
                        id: item.id,
                        docId: item.docId,
                        name: item.name,
                        symbol: item.symbol,
                        score: item.score || 0,
                        rank: item.rank,
                        velocity: item.velocity || 0,
                        momentum: item.momentum || 0,
                        trend: item.trend || [],
                        imageUrl: item.imageUrl,
                        isDampened: item.isDampened,
                        isSponsored: !!sponsor,
                        sponsorLabel: sponsor?.label,
                        totalVotes: item.totalVotes || 0
                    };
                });
                
                // Final server-side sort
                formattedItems.sort((a, b) => (a.isSponsored && !b.isSponsored) ? -1 : ((a.rank || 0) - (b.rank || 0)));
                set({ items: formattedItems, lastRefresh: Date.now(), isSyncing: false });
            }
        } catch (err) {
            console.error("Refresh failed:", err);
            set({ isSyncing: false });
        }
    }
});
