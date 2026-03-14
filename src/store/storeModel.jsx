import { create } from "zustand";
import { auth } from "../firebase";
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
import { apiGet, apiPost } from "../lib/api";

export const useStore = create((set, get) => ({
    user: null,
    reputation: 0,
    balance: 0,
    tier: "Newbie",
    emailVerified: false,
    isAuthLoading: true,
    usePowerVote: false,

    // Currency System
    currency: 'USD',
    currencySymbol: '$',
    rates: { USD: 1, NGN: 1500, EUR: 0.92 },

    setCurrency: (code) => {
        const symbols = { USD: '$', NGN: '₦', EUR: '€' };
        set({ currency: code, currencySymbol: symbols[code] || '$' });
    },

    formatValue: (val) => {
        const state = get();
        const { currency, currencySymbol, rates } = state;
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
    togglePowerVote: () => set((state) => ({ usePowerVote: !state.usePowerVote })),

    callAdminFunction: async (func, args) => {
        const { adminState, items, currentEpoch } = get();
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
                        set({
                            currentEpoch: {
                                epochId: newEpochId,
                                startTime: Date.now(),
                                endTime: Date.now() + 1800000
                            }
                        });
                    }
                    break;
                default:
                    console.warn("Unknown admin function:", func);
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

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
                        rank: item.rank || 1,
                        isSponsored: !!sponsor,
                    };
                });
                formattedItems.sort((a, b) => (a.isSponsored && !b.isSponsored) ? -1 : (a.rank - b.rank));

                // Fetch user votes for this category if logged in
                const { user } = get();
                if (user) {
                    get().fetchUserVotes(slug);
                }

                set({ items: formattedItems, isSyncing: false });
            }
        } catch (err) {
            console.error("API fetch failed:", err.message);
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

    syncUser: () => {
        // Handle redirect result for mobile/Vercel compatibility
        getRedirectResult(auth)
            .then((result) => {
                if (result?.user) {
                    set({ user: result.user, isAuthLoading: false });
                    get().fetchUserProfile();
                }
            })
            .catch((error) => {
                console.error("Redirect error:", error);
            });

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Determine if Google provider is used
                const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
                set({ user, emailVerified: user.emailVerified || isGoogle, isAuthLoading: false });
                await get().fetchUserProfile();
                // Also fetch votes for current category
                const { currentCategorySlug } = get();
                get().fetchUserVotes(currentCategorySlug);
            } else {
                set({ user: null, isAuthLoading: false, balance: 0, reputation: 0, tier: "Newbie", userVotes: {} });
            }
        });
    },

    syncEpoch: (epochData) => {
        if (!epochData) return;
        set({
            currentEpoch: {
                epochId: epochData.epochNumber || epochData.epochId,
                startTime: epochData.startTime,
                endTime: epochData.endTime,
            }
        });
    },

    refreshCurrentCategory: async () => {
        const { currentCategorySlug, setCategoryItems } = get();
        await setCategoryItems(currentCategorySlug);
    },

    fetchUserProfile: async () => {
        if (!auth.currentUser) return;
        try {
            const ref = sessionStorage.getItem('starranker_ref');
            const profile = await apiGet("/api/admin/users/me", ref ? { ref } : {});
            set({
                balance: profile.balance || 0,
                reputation: profile.reputation || 0,
                tier: profile.tier || "Newbie",
                user: {
                    ...auth.currentUser,
                    isAdmin: profile.isAdmin ?? (profile.tier === "Oracle" || auth.currentUser.email === 'peterjohn2343@gmail.com'),
                    isModerator: profile.isModerator ?? ["Sage", "Oracle"].includes(profile.tier),
                    ...profile
                }
            });
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
        const { user, currentCategorySlug, userVotes, items } = get();
        if (!user) return;

        // Optimistic UI update
        const previousVotes = { ...userVotes };
        const newVotes = { ...userVotes };

        // Handle toggle logic (same as backend)
        const currentVote = userVotes[itemId];
        let finalDirection = direction;

        if (direction === 1 && currentVote === 'up') finalDirection = 0;
        else if (direction === -1 && currentVote === 'down') finalDirection = 0;

        if (finalDirection === 1) newVotes[itemId] = 'up';
        else if (finalDirection === -1) newVotes[itemId] = 'down';
        else delete newVotes[itemId];

        set({ userVotes: newVotes });

        try {
            await apiPost("/api/votes", {
                itemDocId: itemId,
                direction: finalDirection,
                categorySlug: currentCategorySlug,
                usePowerVote: get().usePowerVote
            });
            // Profile may change if power votes used or reputation gained
            get().fetchUserProfile();
        } catch (error) {
            console.error("Vote error:", error);
            // Rollback on error
            set({ userVotes: previousVotes });
        }
    },

    placeStake: async (itemId, amount, targetRank, itemName, betType) => {
        try {
            const result = await apiPost("/api/stakes", {
                itemDocId: itemId,
                amount,
                target: targetRank,
                categorySlug: get().currentCategorySlug,
                itemName,
                betType,
            });
            if (result.success) {
                await get().fetchUserProfile();
            }
            return result;
        } catch (error) {
            console.error("Stake error:", error);
            return { success: false, error: error.message };
        }
    },

    getLiveOdds: async (itemId, amount, targetRank, betType) => {
        try {
            return await apiGet("/api/stakes/odds", {
                itemDocId: itemId,
                amount: String(amount),
                target: typeof targetRank === 'object' ? JSON.stringify(targetRank) : String(targetRank),
                categorySlug: get().currentCategorySlug,
                betType,
            });
        } catch (error) {
            console.error("Odds error:", error);
            return null;
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
            // Use Redirect for mobile compatibility (more robust on Vercel/Chrome mobile)
            await signInWithRedirect(auth, provider);
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

    registerWithEmail: async (email, password, username, phoneNumber) => {
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
            const { emailVerified, providerData } = auth.currentUser;
            const isGoogle = providerData.some(p => p.providerId === 'google.com');
            set({ emailVerified: emailVerified || isGoogle });
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
