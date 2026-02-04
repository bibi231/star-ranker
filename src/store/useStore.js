import { create } from "zustand";
import { auth, db, functions } from "../firebase";
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
import { MOCK_DATA } from "../data/mockData";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    query,
    where,
    limit,
    onSnapshot,
    updateDoc,
    addDoc,
    serverTimestamp
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export const useStore = create((set, get) => ({
    user: null,
    reputation: 0,
    balance: 0,
    tier: "Newbie",
    emailVerified: false,
    isAuthLoading: true,
    notifications: [
        { id: 'n1', type: 'security', title: 'AVD Triggered', message: 'Anomalous velocity detected in Bitcoin market. Proportional dampening applied.', read: false },
        { id: 'n2', type: 'system', title: 'Epoch Reification', message: 'Market snapshots for Epoch #482 have been successfully reified.', read: false },
        { id: 'n3', type: 'security', title: 'New Login', message: 'New session established from IP 192.168.1.1.', read: true },
    ],
    votingHistory: [],
    stakes: [],
    items: [],
    categories: [
        { id: 'cat_1', slug: 'crypto', title: 'Crypto Assets', description: 'Top cryptocurrencies by market cap and sentiment.' },
        { id: 'cat_2', slug: 'smartphones', title: 'Smartphones', description: 'Latest flagship devices and mobile tech.' },
        { id: 'cat_3', slug: 'music', title: 'Music Legends', description: 'Greatest artists and albums of all time.' },
        { id: 'cat_4', slug: 'websites', title: 'Websites', description: 'Most influential domains and web services.' },
        { id: 'cat_5', slug: 'tech', title: 'Tech Giants', description: 'Leading technology companies and innovators.' }
    ],
    currentCategorySlug: 'crypto',
    isSyncing: false,
    lastRefresh: Date.now(),
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

    // Actions
    setActiveFilter: (filter) => set({ activeFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    openModal: (modal, item) => set({ activeModal: modal, selectedItem: item }),
    closeModal: () => set({ activeModal: null, selectedItem: null }),

    setCategoryItems: (slug) => {
        // Use static mock data if available, otherwise fallback to generator
        const staticData = MOCK_DATA[slug];

        let mockItems;
        if (staticData) {
            mockItems = staticData.map((item, i) => ({
                id: `item_${slug}_${i}`,
                name: item.name,
                symbol: item.symbol,
                score: Math.floor(Math.random() * 10000) + 1000,
                velocity: (Math.random() * 20) - 10,
                totalVotes: Math.floor(Math.random() * 5000) + 500,
                trend: Array.from({ length: 15 }, () => Math.random() * 100),
                imageUrl: null,
                isDampened: Math.random() > 0.8
            })).sort((a, b) => b.score - a.score);
        } else {
            mockItems = Array.from({ length: 15 }, (_, i) => ({
                id: `item_${slug}_${i}`,
                name: `${slug.charAt(0).toUpperCase() + slug.slice(1)} Asset #${i + 1}`,
                score: Math.floor(Math.random() * 10000),
                velocity: (Math.random() * 20) - 10,
                totalVotes: Math.floor(Math.random() * 5000),
                trend: Array.from({ length: 10 }, () => Math.random() * 100),
                imageUrl: null
            })).sort((a, b) => b.score - a.score);
        }

        set({ items: mockItems, currentCategorySlug: slug });
    },

    getFilteredItems: () => {
        const { items, activeFilter, searchQuery } = get();
        let filtered = [...items];

        if (searchQuery) {
            filtered = filtered.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
                epochId: epochData.epochId,
                startTime: epochData.startTime,
                endTime: epochData.endTime,
            },
            serverTimeOffset: offset
        });
    },

    refreshCurrentCategory: async () => {
        const { currentCategorySlug, setCategoryItems } = get();
        // Trigger a fresh fetch
        set({ lastRefresh: Date.now() });
    },

    fetchUserProfile: async () => {
        if (!auth.currentUser) return;
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            set({
                balance: data.balance || 0,
                reputation: data.reputation || 0,
                tier: data.tier || "Newbie",
                emailVerified: auth.currentUser.emailVerified,
                user: {
                    ...auth.currentUser,
                    isAdmin: data.isAdmin || false,
                    isModerator: data.isModerator || false,
                    ...data
                }
            });

            // Fetch Stakes
            const stakesQuery = query(collection(db, "stakes"), where("userId", "==", auth.currentUser.uid));
            const stakesSnap = await getDocs(stakesQuery);
            set({ stakes: stakesSnap.docs.map(d => ({ id: d.id, ...d.data() })) });
        }
    },

    vote: async (itemId, direction) => {
        const { user, items, userVotes = {} } = get();
        if (!user) return;

        const currentVote = userVotes[itemId] || 0;
        const newVote = direction === currentVote ? 0 : direction;

        await get().performMutation(
            () => {
                const scoreAdjustment = (newVote - currentVote) * (user.reputation > 100 ? 2 : 1);
                const updatedItems = items.map(item => {
                    if (item.id === itemId) {
                        return { ...item, score: item.score + scoreAdjustment, totalVotes: item.totalVotes + (newVote ? 1 : -1) };
                    }
                    return item;
                }).sort((a, b) => b.score - a.score);

                return {
                    items: updatedItems,
                    userVotes: { ...userVotes, [itemId]: newVote }
                };
            },
            async () => {
                await new Promise(r => setTimeout(r, 400));
            }
        );
    },

    placeStake: async (itemId, amount, targetRank, itemName) => {
        const { currentCategorySlug, fetchUserProfile } = get();
        try {
            const placeStakeV2 = httpsCallable(functions, 'placeStakeV2');
            const result = await placeStakeV2({
                itemId,
                amount,
                targetRank,
                categoryId: currentCategorySlug,
                itemName
            });

            if (result.data.success) {
                await fetchUserProfile();
                set({ lastRefresh: Date.now() });
                return true;
            }
            return false;
        } catch (error) {
            console.error("DMAO Staking Error:", error);
            alert(`Staking Failed: ${error.message}`);
            return false;
        }
    },

    getLiveOdds: async (itemId, amount, targetRank) => {
        const { currentCategorySlug } = get();
        try {
            const getOddsFunc = httpsCallable(functions, 'getLiveOdds');
            const result = await getOddsFunc({
                itemId,
                amount,
                targetRank,
                categoryId: currentCategorySlug
            });
            return result.data;
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

    markNotificationAsRead: (id) => set(state => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    })),

    // --- Authentication Actions (Restored) ---

    login: async () => {
        set({ isAuthLoading: true });
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // syncUser listener handles state update
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
            // syncUser listener handles state update
        } catch (error) {
            set({ isAuthLoading: false });
            throw error;
        }
    },

    registerWithEmail: async (email, password, username, phoneNumber = '') => {
        set({ isAuthLoading: true });
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: username });

            // Create user document
            await setDoc(doc(db, "users", user.uid), {
                username,
                email,
                phoneNumber, // Storing phone number as requested
                balance: 1000,
                reputation: 100,
                tier: "Newbie",
                createdAt: serverTimestamp(),
                isAdmin: false,
                isModerator: false
            });

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
    }
}));
