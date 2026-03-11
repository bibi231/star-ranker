import { create } from "zustand";
import { auth } from "../firebase";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile
} from "firebase/auth";
import { apiGet, apiPost } from "../lib/api";

export const useStore = create((set, get) => ({
    user: null,
    reputation: 0,
    balance: 0,
    tier: "Newbie",
    emailVerified: false,
    isAuthLoading: true,

    // Currency System
    currency: 'USD',
    currencySymbol: '$',
    rates: { USD: 1, NGN: 1500, EUR: 0.92 },

    setCurrency: (code) => {
        const symbols = { USD: '$', NGN: '₦', EUR: '€' };
        set({ currency: code, currencySymbol: symbols[code] || '$' });
    },

    formatValue: (val) => {
        const { currency, currencySymbol, rates } = get();
        const converted = val * (rates[currency] || 1);
        return `${currencySymbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    },

    notifications: [],
    votingHistory: [],
    stakes: [],
    items: [],
    categories: [],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

    fetchCategories: async () => {
        try {
            const data = await apiGet("/api/categories");
            if (data && Array.isArray(data) && data.length > 0) {
                set({ categories: data });
            }
        } catch (err) {
            console.error("Failed to fetch categories:", err);
            // Fallback: if store has no categories, use hardcoded defaults
            const { categories } = get();
            if (categories.length === 0) {
                set({
                    categories: [
                        { id: 1, slug: 'crypto', title: 'Crypto Assets', description: 'Top cryptocurrencies.' },
                        { id: 2, slug: 'smartphones', title: 'Smartphones', description: 'Mobile devices.' },
                        { id: 3, slug: 'music', title: 'Music Artists', description: 'Top artists.' },
                        { id: 4, slug: 'websites', title: 'Websites & Apps', description: 'Top platforms.' },
                        { id: 5, slug: 'tech', title: 'Tech Companies', description: 'Leading tech.' },
                    ]
                });
            }
        }
    },
    currentCategorySlug: 'crypto',
    isSyncing: false,
    lastRefresh: Date.now(),
    userVotes: {},
    currentEpoch: {
        epochId: 1,
        startTime: Date.now(),
        endTime: Date.now() + 1800000
    },
    serverTimeOffset: 0,

    setUser: (user) => set({ user }),
    setReputation: (reputation) => set({ reputation }),
    setBalance: (balance) => set({ balance }),
    setTier: (tier) => set({ tier }),
    setEmailVerified: (emailVerified) => set({ emailVerified }),
    setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

    // Layout & UI State
    activeFilter: 'all',
    searchQuery: '',
    activeModal: null,
    selectedItem: null,

    // Admin State (Simulation)
    adminState: {
        killswitch: false,
        epochsPaused: false,
        frozenMarkets: {},
        lockedItems: {}
    },

    // Actions
    setActiveFilter: (filter) => set({ activeFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    openModal: (modal, item) => set({ activeModal: modal, selectedItem: item }),
    closeModal: () => set({ activeModal: null, selectedItem: null }),

    callAdminFunction: async (func, args) => {
        const { adminState, items, currentEpoch } = get();
        console.log(`[ADMIN-OPS] Executing ${func} with:`, args);

        await new Promise(r => setTimeout(r, 800));

        try {
            switch (func) {
                case 'emergencyKillswitch':
                    set({ adminState: { ...adminState, killswitch: !adminState.killswitch } });
                    break;
                case 'toggleEpochProgression':
                    set({ adminState: { ...adminState, epochsPaused: args.isPaused } });
                    break;
                case 'forceEpochRollover':
                    if (currentEpoch) {
                        const newEpochId = currentEpoch.epochId + 1;
                        const duration = 30 * 60 * 1000;
                        set({
                            currentEpoch: {
                                epochId: newEpochId,
                                startTime: Date.now(),
                                endTime: Date.now() + duration
                            }
                        });
                    }
                    break;
                case 'freezeMarket':
                    const frozen = { ...adminState.frozenMarkets };
                    frozen[args.marketId] = !frozen[args.marketId];
                    set({ adminState: { ...adminState, frozenMarkets: frozen } });
                    break;
                case 'lockItem':
                case 'delistItem':
                    const updatedItems = items.map(i => {
                        if (i.id === args.itemId) {
                            return { ...i, status: func === 'lockItem' ? 'locked' : 'archived' };
                        }
                        return i;
                    });
                    set({ items: updatedItems });
                    break;
                default:
                    console.warn("Unknown admin function:", func);
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // ===== DATA FETCHING (Express API) =====

    setCategoryItems: async (slug) => {
        set({ currentCategorySlug: slug, isSyncing: true });

        try {
            const [apiItems, apiSponsors] = await Promise.all([
                apiGet("/api/items", { category: slug }),
                apiGet("/api/sponsorships/active", { category: slug }).catch(() => [])
            ]);

            if (apiItems && Array.isArray(apiItems)) {
                let formattedItems = apiItems.map(item => {
                    const sponsor = apiSponsors.find(s => s.itemId === item.docId);
                    return {
                        id: item.docId,
                        name: item.name,
                        symbol: item.symbol,
                        score: item.score || 0,
                        velocity: item.velocity || 0,
                        totalVotes: item.totalVotes || 0,
                        trend: item.trend || Array.from({ length: 15 }, () => Math.random() * 100),
                        imageUrl: item.imageUrl,
                        isDampened: item.isDampened || false,
                        rank: item.rank || 1,
                        momentum: item.momentum || 0,
                        volatility: item.volatility || 5,
                        isSponsored: !!sponsor,
                        sponsorLabel: sponsor?.label || '',
                    };
                });

                // Pin sponsored items to top
                formattedItems.sort((a, b) => {
                    if (a.isSponsored && !b.isSponsored) return -1;
                    if (!a.isSponsored && b.isSponsored) return 1;
                    return a.rank - b.rank;
                });

                // Load user votes if logged in
                let userVotes = {};
                const { user } = get();
                if (user) {
                    try {
                        const votes = await apiGet("/api/votes", { category: slug });
                        if (votes) userVotes = votes;
                    } catch (e) {
                        console.warn("Could not load user votes:", e);
                    }
                }

                set({ items: formattedItems, isSyncing: false, userVotes });
                return;
            }
        } catch (err) {
            console.error("API fetch failed:", err.message);
        }

        set({ items: [], isSyncing: false });
    },

    getFilteredItems: () => {
        const { items, activeFilter, searchQuery } = get();
        let filtered = [...items];

        if (searchQuery) {
            filtered = filtered.filter(i =>
                i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                i.symbol?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        switch (activeFilter) {
            case 'gainers': return filtered.filter(i => i.velocity > 0);
            case 'losers': return filtered.filter(i => i.velocity < 0);
            case 'movers': return filtered.filter(i => Math.abs(i.velocity) > 5);
            case 'sleepers': return filtered.filter(i => Math.abs(i.velocity) < 2);
            default: return filtered;
        }
    },

    syncUser: () => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                set({ user, isAuthLoading: false });
                await get().fetchUserProfile();
            } else {
                set({ user: null, isAuthLoading: false, balance: 0, reputation: 0, tier: "Newbie" });
            }
        });
    },

    syncEpoch: (epochData) => {
        if (!epochData) return;
        const offset = epochData.serverTime - Date.now();
        set({
            currentEpoch: {
                epochId: epochData.epochId || epochData.epochNumber,
                startTime: epochData.startTime,
                endTime: epochData.endTime,
            },
            serverTimeOffset: offset
        });
    },

    refreshCurrentCategory: async () => {
        const { currentCategorySlug, setCategoryItems } = get();
        set({ lastRefresh: Date.now() });
        await setCategoryItems(currentCategorySlug);
    },

    fetchUserProfile: async () => {
        if (!auth.currentUser) return;
        try {
            const refCode = sessionStorage.getItem('starranker_ref');
            const url = refCode ? `/api/admin/users/me?ref=${refCode}` : `/api/admin/users/me`;
            const profile = await apiGet(url);

            if (refCode) sessionStorage.removeItem('starranker_ref');

            set({
                balance: profile.balance || 0,
                reputation: profile.reputation || 0,
                tier: profile.tier || "Newbie",
                emailVerified: auth.currentUser.emailVerified,
                user: {
                    ...auth.currentUser,
                    isAdmin: profile.tier === "Oracle",
                    isModerator: ["Sage", "Oracle"].includes(profile.tier),
                    ...profile
                }
            });

            // Fetch user stakes
            try {
                const userStakes = await apiGet("/api/stakes/mine");
                set({ stakes: userStakes });
            } catch (e) {
                console.warn("Could not load stakes:", e);
            }
        } catch (err) {
            console.warn("Could not fetch profile:", err);
        }
    },

    bindWallet: async (walletAddress) => {
        try {
            await apiPost("/api/auth/bind-wallet", { walletAddress });
            set((state) => ({ user: state.user ? { ...state.user, walletAddress } : null }));
        } catch (error) {
            console.error("Wallet binding failed:", error);
        }
    },

    vote: async (itemId, direction) => {
        const { user, items, currentCategorySlug, userVotes = {} } = get();
        if (!user) return;

        const usePowerVote = (user.powerVotes || 0) > 0;
        const multiplier = usePowerVote ? 3 : 1;

        const voteKey = direction === 1 ? 'up' : 'down';
        const currentVote = userVotes[itemId];
        const newDirection = currentVote === voteKey ? 0 : direction;
        const newVoteKey = newDirection === 0 ? null : (newDirection === 1 ? 'up' : 'down');

        const previousDirection = currentVote === 'up' ? 1 : currentVote === 'down' ? -1 : 0;
        const scoreDelta = (newDirection - previousDirection) * multiplier;

        await get().performMutation(
            () => {
                const updatedItems = items.map(item => {
                    if (item.id === itemId) {
                        const voteCountDelta = (newDirection !== 0 && previousDirection === 0) ? 1 : (newDirection === 0 && previousDirection !== 0) ? -1 : 0;
                        return { ...item, score: item.score + scoreDelta, totalVotes: item.totalVotes + voteCountDelta };
                    }
                    return item;
                }).sort((a, b) => b.score - a.score);

                const newUserVotes = { ...userVotes };
                if (newVoteKey) {
                    newUserVotes[itemId] = newVoteKey;
                } else {
                    delete newUserVotes[itemId];
                }

                let updatedUser = { ...user };
                if (usePowerVote && newDirection !== 0 && previousDirection === 0) {
                    updatedUser.powerVotes = Math.max(0, updatedUser.powerVotes - 1);
                }

                return { items: updatedItems, userVotes: newUserVotes, user: updatedUser };
            },
            async () => {
                await apiPost("/api/votes", {
                    itemDocId: itemId,
                    direction: newDirection,
                    categorySlug: currentCategorySlug,
                    usePowerVote
                });

                // Sync actual DB balance
                get().fetchUserProfile();
            }
        );
    },

    placeStake: async (itemId, amount, targetRank, itemName) => {
        const { currentCategorySlug, fetchUserProfile } = get();
        try {
            const result = await apiPost("/api/stakes", {
                itemDocId: itemId,
                amount,
                target: targetRank,
                categorySlug: currentCategorySlug,
                itemName,
                betType: "exact",
            });

            if (result.success) {
                await fetchUserProfile();
                set({ lastRefresh: Date.now() });
                return true;
            }
            return false;
        } catch (error) {
            console.error("DMAO Staking Error:", error);
            return false;
        }
    },

    getLiveOdds: async (itemId, amount, targetRank) => {
        const { currentCategorySlug } = get();
        try {
            return await apiGet("/api/stakes/odds", {
                itemDocId: itemId,
                amount: String(amount),
                target: String(targetRank),
                categorySlug: currentCategorySlug,
                betType: "exact",
            });
        } catch (error) {
            console.error("Odds Fetch Error:", error);
            return null;
        }
    },

    performMutation: async (optimisticUpdate, serverAction) => {
        const previousState = { ...get() };
        set({ isSyncing: true, ...optimisticUpdate() });

        try {
            await serverAction();
            set({ isSyncing: false });
        } catch (error) {
            console.error("Rollback triggered:", error);
            set({ ...previousState, isSyncing: false });
        }
    },

    // ===== NOTIFICATIONS =====
    fetchNotifications: async () => {
        try {
            const data = await apiGet("/api/notifications");
            set({ notifications: data });
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    },

    markNotificationAsRead: async (id) => {
        try {
            await apiPost(`/api/notifications/${id}/read`);
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, read: true } : n
                ),
            }));
        } catch (error) {
            console.error("Failed to mark alert as read:", error);
        }
    },

    markAllRead: async () => {
        try {
            await apiPost("/api/notifications/read-all");
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, read: true })),
            }));
        } catch (error) {
            console.error("Failed to mark all alerts as read:", error);
        }
    },

    login: async () => {
        set({ isAuthLoading: true });
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
            set({ isAuthLoading: false });
            throw error;
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
            set({ user: null, balance: 0, reputation: 0, tier: "Newbie", stakes: [] });
        } catch (error) {
            console.error("Logout failed", error);
        }
    },

    loginWithEmail: async (email, password) => {
        set({ isAuthLoading: true });
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            set({ isAuthLoading: false });
            throw error;
        }
    },

    registerWithEmail: async (email, password, username) => {
        set({ isAuthLoading: true });
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: username });
            await sendEmailVerification(user);
        } catch (error) {
            set({ isAuthLoading: false });
            throw error;
        }
    },

    resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email);
    },

    sendVerificationEmail: async () => {
        if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
        }
    },

    refreshUser: async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            set({ emailVerified: auth.currentUser.emailVerified });
            await get().fetchUserProfile();
        }
    },

    seedDatabase: async () => {
        try {
            const result = await apiPost("/api/admin/seed");
            return result;
        } catch (error) {
            console.error("Seed error:", error);
            throw error;
        }
    }
}));
