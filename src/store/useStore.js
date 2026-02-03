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
    updateProfile
} from "firebase/auth";

export const useStore = create((set, get) => ({
    user: null,
    reputation: 0,
    balance: 0,
    tier: "Newbie",
    isAuthLoading: true,
    notifications: [
        { id: 'n1', type: 'security', title: 'AVD Triggered', message: 'Anomalous velocity detected in Bitcoin market. Proportional dampening applied.', read: false },
        { id: 'n2', type: 'system', title: 'Epoch Reification', message: 'Market snapshots for Epoch #482 have been successfully reified.', read: false },
        { id: 'n3', type: 'security', title: 'New Login', message: 'New session established from IP 192.168.1.1.', read: true },
    ],
    votingHistory: [],

    reputationHistory: [],
    userVotes: {}, // itemId: 'up' | 'down' | null

    // UI State
    activeModal: null, // 'stake' | 'auth' | null
    selectedItem: null,

    // Firebase Auth Sync
    syncUser: () => {
        // Fallback: Ensure loader disappears after 3 seconds even if Firebase hangs
        const fallback = setTimeout(() => {
            if (get().isAuthLoading) {
                console.warn("Auth sync timed out - check Firebase config");
                set({ isAuthLoading: false });
            }
        }, 3000);

        try {
            onAuthStateChanged(auth, (user) => {
                clearTimeout(fallback);
                if (user) {
                    set({
                        user: {
                            id: user.uid,
                            username: user.displayName || user.email?.split('@')[0] || 'Oracle',
                            email: user.email,
                            photo: user.photoURL
                        },
                        reputation: 1540,
                        balance: 2450.0,
                        tier: "Oracle",
                        isAuthLoading: false
                    });
                } else if (localStorage.getItem('demo_admin') === 'true') {
                    set({
                        user: {
                            id: 'demo-admin-id',
                            username: 'Admin Alpha',
                            email: 'admin@star-ranker.com',
                            photo: null
                        },
                        reputation: 9999,
                        balance: 100000.0,
                        tier: "Oracle",
                        isAuthLoading: false
                    });
                } else {
                    set({ user: null, reputation: 0, balance: 0, tier: "Newbie", isAuthLoading: false });
                }
            });
        } catch (error) {
            console.error("Firebase auth sync failed:", error);
            clearTimeout(fallback);
            set({ isAuthLoading: false });
        }
    },

    // Auth Actions
    login: async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    },

    registerWithEmail: async (email, password, username) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
        return cred.user;
    },

    loginWithEmail: async (email, password) => {
        if (email === 'admin@star-ranker.com' && password === 'password123') {
            localStorage.setItem('demo_admin', 'true');
            set({
                user: {
                    id: 'demo-admin-id',
                    username: 'Admin Alpha',
                    email: 'admin@star-ranker.com',
                    photo: null
                },
                reputation: 9999,
                balance: 100000.0,
                tier: "Oracle"
            });
            return { user: { email } };
        }
        return await signInWithEmailAndPassword(auth, email, password);
    },


    resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email);
    },

    logout: async () => {
        localStorage.removeItem('demo_admin');
        await signOut(auth);
    },


    categories: [
        { id: "cat_1", slug: "crypto", title: "Crypto Real-Time", description: "Top Cryptocurrencies by market sentiment and velocity." },
        { id: "cat_2", slug: "tech", title: "Tech Giants", description: "The most influential technology companies globally." },
        { id: "cat_3", slug: "smartphones", title: "Smartphones", description: "Historical and current mobile devices by consumer value." },
        { id: "cat_4", slug: "music", title: "Music Legends", description: "Mapping artistic influence across streaming and sales." },
        { id: "cat_5", slug: "web", title: "Web Platforms", description: "The sites that define the modern internet." },
    ],
    currentCategorySlug: "crypto",
    items: [],
    stakes: [],
    searchQuery: "",
    activeFilter: "all", // 'all' | 'gainers' | 'losers'
    isSyncing: false,

    setSearchQuery: (query) => set({ searchQuery: query }),
    setActiveFilter: (filter) => set({ activeFilter: filter }),

    getFilteredItems: () => {
        const { items, searchQuery, activeFilter } = get();
        let filtered = [...items];

        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (activeFilter === 'gainers') {
            filtered = filtered.filter(i => i.velocity > 0).sort((a, b) => b.velocity - a.velocity);
        } else if (activeFilter === 'losers') {
            filtered = filtered.filter(i => i.velocity < 0).sort((a, b) => a.velocity - b.velocity);
        }

        return filtered;
    },

    setCategoryItems: (slug) => {
        // Massive Seeding Data
        const mockData = {
            crypto: [
                { id: "c1", name: "Bitcoin", score: 85200, velocity: 1.2, totalVotes: 12500, trend: [40, 42, 45, 48, 47, 49, 50] },
                { id: "c2", name: "Ethereum", score: 48400, velocity: -0.5, totalVotes: 8900, trend: [30, 29, 28, 29, 30, 29.5, 29] },
                { id: "c3", name: "Solana", score: 32600, velocity: 15.4, totalVotes: 9800, trend: [10, 15, 22, 28, 30, 31, 32.6] },
                { id: "c4", name: "XRP", score: 18200, velocity: 2.1, totalVotes: 4500, trend: [15, 16, 17, 18, 17.5, 18, 18.2] },
                { id: "c5", name: "Cardano", score: 12400, velocity: -4.2, totalVotes: 3200, trend: [14, 13, 12, 11, 12.5, 12, 12.4] },
                { id: "c6", name: "Polkadot", score: 9800, velocity: 0.8, totalVotes: 2100, trend: [9, 9.2, 9.5, 9.8, 9.7, 9.8, 9.8] },
                { id: "c7", name: "Chainlink", score: 15600, velocity: 8.5, totalVotes: 4100, trend: [10, 12, 13, 14, 15, 15.2, 15.6] },
                { id: "c8", name: "Avalanche", score: 11200, velocity: 5.1, totalVotes: 2800, trend: [9, 10, 10.5, 11, 11.2, 11.2, 11.2] },
                { id: "c9", name: "Polygon", score: 8400, velocity: -1.5, totalVotes: 1900, trend: [9, 8.8, 8.5, 8.4, 8.4, 8.4, 8.4] },
                { id: "c10", name: "Dogecoin", score: 45000, velocity: 22.1, totalVotes: 55000, trend: [20, 35, 40, 42, 45, 45, 45] },
            ],
            tech: [
                { id: "t1", name: "Apple", score: 98200, velocity: 0.5, totalVotes: 150000, trend: [95, 96, 97, 98, 98.2] },
                { id: "t2", name: "NVIDIA", score: 95400, velocity: 45.2, totalVotes: 85000, trend: [40, 60, 85, 92, 95.4] },
                { id: "t3", name: "Microsoft", score: 92100, velocity: 1.1, totalVotes: 120000, trend: [90, 91, 91.5, 92.1] },
                { id: "t4", name: "Tesla", score: 78500, velocity: -12.4, totalVotes: 210000, trend: [90, 85, 80, 78.5] },
                { id: "t5", name: "Google", score: 91000, velocity: 0.2, totalVotes: 110000, trend: [90, 91, 91] },
            ],
            smartphones: [
                { id: "p1", name: "iPhone 15 Pro", score: 12000, velocity: 5.2, totalVotes: 4500, trend: [10, 11, 12, 12] },
                { id: "p2", name: "Samsung Galaxy S24", score: 11500, velocity: 8.1, totalVotes: 3800, trend: [9, 10, 11, 11.5] },
                { id: "p3", name: "Pixel 8 Pro", score: 9800, velocity: -1.2, totalVotes: 2100, trend: [10, 9.5, 9.8] },
                { id: "p4", name: "Nothing Phone (2)", score: 4500, velocity: 15.5, totalVotes: 800, trend: [2, 3, 4, 4.5] },
            ],
            music: [
                { id: "m1", name: "Taylor Swift", score: 150000, velocity: 12.5, totalVotes: 500000, trend: [140, 145, 150] },
                { id: "m2", name: "The Weeknd", score: 98000, velocity: 2.1, totalVotes: 350000, trend: [95, 97, 98] },
                { id: "m3", name: "Drake", score: 85000, velocity: -5.4, totalVotes: 420000, trend: [90, 88, 85] },
            ],
            web: [
                { id: "w1", name: "Star Ranker", score: 12000, velocity: 150.5, totalVotes: 5000, trend: [1, 5, 25, 120] },
                { id: "w2", name: "Twitter / X", score: 85000, velocity: -2.5, totalVotes: 850000, trend: [90, 88, 85] },
                { id: "w3", name: "Reddit", score: 92000, velocity: 1.2, totalVotes: 650000, trend: [90, 91, 92] },
            ]
        };
        set({ items: mockData[slug] || [], currentCategorySlug: slug });
    },

    // Refactored Voting: EXCLUSIVE Up/Down + Persistence Logic
    vote: (itemId, direction) => {
        const { userVotes, items, tier, performMutation } = get();
        const currentVote = userVotes[itemId];

        let scoreAdjustment = 0;
        const weight = tier === "Oracle" ? 5 : tier === "Sage" ? 2 : 1;

        performMutation(
            () => {
                // EXCLUSIVE LOGIC
                // If user clicks same as current, they are neutralizing it (removing it)
                // If user clicks opposite, they are switching and we must revert previous
                let newVote = direction === 1 ? 'up' : 'down';

                if (currentVote === 'up') {
                    scoreAdjustment -= weight; // Remove previous up
                } else if (currentVote === 'down') {
                    scoreAdjustment += weight; // Remove previous down
                }

                if (currentVote === newVote) {
                    newVote = null; // Toggle off if clicked same
                } else {
                    scoreAdjustment += (direction * weight); // Apply new direction
                }

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
                // Prod: await dataconnect.mutate({ updateVote: { itemId, direction: newVote } });
            }
        );
    },

    placeStake: async (itemId, amount, targetRank) => {
        const { balance, items } = get();
        if (balance < amount) return false;

        let res = false;
        await get().performMutation(
            () => {
                const item = items.find(i => i.id === itemId);
                const newStake = {
                    id: Math.random().toString(36).substr(2, 9),
                    itemId,
                    itemName: item.name,
                    amount,
                    targetRank,
                    odds: (4 / targetRank).toFixed(2),
                    status: 'active',
                    createdAt: new Date()
                };
                res = true;
                return { balance: balance - amount, stakes: [...get().stakes, newStake] };
            },
            async () => {
                await new Promise(r => setTimeout(r, 1000));
            }
        );
        return res;
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

    // Modal Control
    openModal: (type, item = null) => set({ activeModal: type, selectedItem: item }),
    closeModal: () => set({ activeModal: null, selectedItem: null }),
}));
