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
    syncInterval: null,
    usePowerVote: false,
    isWithdrawalOpen: false,
    setWithdrawalOpen: (val) => set({ isWithdrawalOpen: val }),

    // Currency System
    currency: 'USD',
    currencySymbol: '$',
    rates: { USD: 1, NGN: 1500, EUR: 0.92, GBP: 0.79 },

    fetchRates: async () => {
        try {
            const apiRates = await import('../lib/api').then(m => m.apiGet('/api/currency/rates'));
            if (apiRates && apiRates.NGN_USD) {
                const usdToNgn = 1 / apiRates.NGN_USD;
                const usdToEur = usdToNgn * (apiRates.NGN_EUR || 0);
                const usdToGbp = usdToNgn * (apiRates.NGN_GBP || 0);
                set({
                    rates: { USD: 1, NGN: usdToNgn, EUR: usdToEur || 0.92, GBP: usdToGbp || 0.79 }
                });
            }
        } catch (e) {
            console.error('Failed to fetch live rates:', e);
        }
    },

    setCurrency: (code) => {
        const symbols = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
        set({ currency: code, currencySymbol: symbols[code] || '$' });
    },

    parseLocalToUSD: (localVal) => {
        const { currency, rates } = get();
        let num = Number(localVal);
        if (isNaN(num) || !rates[currency]) return 0;
        return num / rates[currency];
    },

    formatValue: (val) => {
        const { currency, currencySymbol, rates } = get();
        const num = Number(val) || 0;
        const converted = Math.max(0, num * (rates[currency] || 1));
        const decimals = currency === 'NGN' ? 0 : 2;
        return `${currencySymbol}${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    },

    notifications: [],
    votingHistory: [],
    stakes: [],
    items: [],
    categories: [],
    reputationHistory: [],
    bio: '',
    settings: {
        twoFactorEnabled: false,
        emailNotifications: true,
        pushNotifications: true,
        marketAlerts: true,
        settlementAlerts: true,
    },
    isDepositOpen: false,
    setDepositOpen: (val) => set({ isDepositOpen: val }),
    isVotePackModalOpen: false,
    setVotePackModalOpen: (val) => set({ isVotePackModalOpen: val }),
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

    devOverrideLogin: async (email) => {
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') return;
        set({ isAuthLoading: true });

        const SUPER_ADMINS = ['peterjohn2343@gmail.com', 'admin@starranker.io'];
        const isSuperAdmin = SUPER_ADMINS.includes(email);
        const isModerator = isSuperAdmin || email.includes('moderator');

        // Mock a user object
        const mockUser = {
            uid: `dev_${email.split('@')[0]}`,
            email,
            displayName: `Dev ${email.split('@')[0]}`,
            emailVerified: true,
            isAdmin: isSuperAdmin,
            isModerator: isModerator,
            tier: isSuperAdmin ? "Oracle" : (isModerator ? "Sage" : "Newbie"),
            getIdToken: async () => "mock-token-for-dev"
        };

        set({
            user: mockUser,
            emailVerified: true,
            tier: mockUser.tier,
            isAdmin: mockUser.isAdmin,
            isModerator: mockUser.isModerator
        });
        set({ isAuthLoading: false });
    },

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
    currentEpoch: null,
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
        const { adminState, currentEpoch } = get();
        try {
            switch (func) {
                case 'emergencyKillswitch': {
                    const res = await apiPost('/api/admin/killswitch');
                    if (res?.success) {
                        set({ adminState: { ...adminState, killswitch: res.killswitch } });
                        return { success: true };
                    }
                    return res || { success: false, error: 'Unknown error' };
                }
                case 'toggleEpochProgression': {
                    const res = await apiPost('/api/admin/toggle-epochs', { isPaused: args.isPaused });
                    if (res?.success) {
                        set({ adminState: { ...adminState, epochsPaused: res.epochsPaused } });
                        return { success: true };
                    }
                    return res || { success: false, error: 'Unknown error' };
                }
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
                    return { success: true };
                default:
                    console.warn("Unknown admin function:", func);
                    return { success: false, error: "Unknown function" };
            }
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

    fetchMovers: async (categoryId, type) => {
        set({ isSyncing: true });
        try {
            const data = await apiGet(`/api/items/movers?categoryId=${categoryId}&type=${type}`);
            if (data && Array.isArray(data)) {
                // Map the data similar to fetch category items
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
                    rankChange: item.rankChange || 0, // NEW field from API
                    isSponsored: false,
                }));
                // Fetch user votes if logged in
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
                const { currentCategorySlug, syncInterval } = get();
                get().fetchUserVotes(currentCategorySlug);

                // Setup background synchronization (60s loop)
                if (!syncInterval) {
                    const interval = setInterval(() => {
                        console.log("[Sync] Background refresh triggered");
                        get().fetchUserProfile();
                    }, 60000);
                    set({ syncInterval: interval });
                }
            } else {
                const { syncInterval } = get();
                if (syncInterval) clearInterval(syncInterval);
                set({ user: null, isAuthLoading: false, balance: 0, reputation: 0, tier: "Newbie", userVotes: {}, syncInterval: null });
            }
        });
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
                        epochId: data.epochNumber || data.id,
                        startTime: data.startTime,
                        endTime: data.endTime,
                    },
                    serverTimeOffset: skew
                });
            }
        } catch (err) {
            console.error("Failed to fetch current epoch:", err);
            // Fallback for UI if API fails completely
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
        const SUPER_ADMINS = ['peterjohn2343@gmail.com', 'admin@starranker.io'];
        const isSuperAdminEmail = SUPER_ADMINS.includes(auth.currentUser.email);

        try {
            const ref = sessionStorage.getItem('starranker_ref');
            const profile = await apiGet("/api/admin/users/me", ref ? { ref } : {});
            console.log("[Store] Profile response:", profile);

            set({
                balance: Number(profile.balance) || 0,
                reputation: profile.reputation || 0,
                tier: isSuperAdminEmail ? "Oracle" : (profile.tier || "Newbie"),
                user: {
                    ...auth.currentUser,
                    isAdmin: isSuperAdminEmail || (profile.isAdmin ?? (profile.tier === "Oracle")),
                    isModerator: isSuperAdminEmail || (profile.isModerator ?? ["Sage", "Oracle"].includes(profile.tier)),
                    ...profile
                }
            });

            // Also load user's active stakes
            get().fetchStakes();
        } catch (err) {
            console.warn("Could not fetch profile:", err);
            if (isSuperAdminEmail) {
                // Emergency fallback for superadmin to ensure UI access
                set({
                    tier: "Oracle",
                    user: {
                        ...auth.currentUser,
                        isAdmin: true,
                        isModerator: true
                    }
                });
            }
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
            const response = await apiPost("/api/votes", {
                itemDocId: itemId,
                direction: finalDirection,
                categorySlug: currentCategorySlug,
                usePowerVote: get().usePowerVote
            });
            // Instantly update power vote count if one was used
            if (response?.newPowerVotes !== undefined) {
                set(state => ({
                    user: { ...state.user, powerVotes: response.newPowerVotes }
                }));
            }
            // Also refresh full profile for reputation etc.
            get().fetchUserProfile();
        } catch (error) {
            console.error("Vote error:", error);
            // Rollback on error
            set({ userVotes: previousVotes });
        }
    },

    fetchStakes: async () => {
        try {
            const data = await apiGet("/api/stakes/my");
            if (Array.isArray(data)) {
                set({
                    stakes: data.map(s => ({
                        ...s,
                        targetRank: typeof s.target === 'number' ? s.target : s.target?.min || '—',
                        odds: s.effectiveMultiplier || 2,
                    }))
                });
            }
        } catch (err) {
            console.error("Failed to fetch stakes:", err);
        }
    },

    placeStake: async (itemId, amount, targetRank, itemName, betType) => {
        const { balance } = get();
        if (balance - amount < 1.0) {
            return { success: false, error: "Must maintain a minimum balance of $1.00 USD" };
        }
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
                await get().fetchStakes();
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
            set({ notifications: data || [] });
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    },

    // ===== REPUTATION HISTORY =====
    fetchReputationHistory: async () => {
        try {
            const data = await apiGet("/api/user/reputation-history");
            set({ reputationHistory: data?.history || [] });
        } catch (e) {
            console.error("Failed to fetch reputation history:", e);
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
    },

    updateProfile: async (updates) => {
        try {
            const { apiPost } = await import('../lib/api');
            const result = await apiPost('/api/user/profile', updates);
            if (result && !result.error) {
                set(state => ({
                    bio: updates.bio ?? state.bio,
                    user: { ...state.user, ...result }
                }));
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to update profile:', err);
            return false;
        }
    },

    updateSettings: async (newSettings) => {
        try {
            set(state => ({
                settings: { ...state.settings, ...newSettings }
            }));
            return true;
        } catch (err) {
            console.error('Failed to update settings:', err);
            return false;
        }
    },
}));

if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.useStore = useStore;
}
