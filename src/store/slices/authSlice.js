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

export const createAuthSlice = (set, get) => ({
    user: null,
    reputation: 0,
    balance: 0,
    playBalance: 0,
    tier: "Newbie",
    emailVerified: false,
    isAuthLoading: true,
    bio: '',
    settings: {
        twoFactorEnabled: false,
        emailNotifications: true,
        pushNotifications: true,
        marketAlerts: true,
        settlementAlerts: true,
    },
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    devOverrideLogin: async (email) => {
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') return;
        set({ isAuthLoading: true });

        const superUser = isSuperAdminEmail(email);
        const isModerator = superUser || email.includes('moderator');

        // Mock a user object
        const mockUser = {
            uid: `dev_${email.split('@')[0]}`,
            email,
            displayName: `Dev ${email.split('@')[0]}`,
            emailVerified: true,
            isSuperAdmin: superUser,
            isAdmin: superUser,
            isModerator: isModerator,
            tier: superUser ? "Oracle" : (isModerator ? "Sage" : "Newbie"),
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
    setUser: (user) => set({ user }),
    setReputation: (reputation) => set({ reputation }),
    setBalance: (balance) => set({ balance }),
    setTier: (tier) => set({ tier }),
    setEmailVerified: (emailVerified) => set({ emailVerified }),
    setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
    syncUser: () => {
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
                const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
                set({ user, emailVerified: user.emailVerified || isGoogle, isAuthLoading: false });
                await get().fetchUserProfile();

                const { currentCategorySlug } = get();
                get().fetchUserVotes(currentCategorySlug);
                get().startBackgroundSync();
            } else {
                get().stopBackgroundSync();
                set({ user: null, isAuthLoading: false, balance: 0, playBalance: 0, reputation: 0, tier: "Newbie", bio: "", userVotes: {}, syncInterval: null });
            }
        });
    },
    fetchUserProfile: async () => {
        if (!auth.currentUser) return;
        const superUser = isSuperAdminEmail(auth.currentUser.email);

        try {
            const ref = sessionStorage.getItem('starranker_ref');
            const profile = await apiGet("/api/admin/users/me", ref ? { ref } : {});
            console.log("[Store] Profile response:", profile);

            if (profile) {
                set({
                    reputation: profile.reputation || 0,
                    balance: profile.balance || 0,
                    playBalance: profile.playBalance || 0,
                    demoBalance: profile.demoBalance || 50000,
                    isDemoMode: profile.isDemoMode ?? true,
                    hasCompletedTour: profile.hasCompletedTour || false,
                    tier: profile.tier || "Newbie",
                    bio: profile.bio || "",
                    settings: profile.settings || get().settings,
                    isAdmin: profile.isAdmin || false,
                    isModerator: profile.isModerator || false,
                });
                
                // Fetch demo stats if in demo mode
                if (profile.isDemoMode) {
                    const stats = await apiGet('/api/demo/stats');
                    if (stats) set({ demoStats: stats });
                }
            }

            set({
                user: {
                    ...auth.currentUser,
                    ...profile,
                    isSuperAdmin: superUser,
                    isAdmin: superUser || profile.isAdmin,
                    isModerator:
                        superUser ||
                        (profile.isModerator ?? ["Sage", "Oracle"].includes(profile.tier)),
                }
            });

            get().fetchStakes();
        } catch (err) {
            console.warn("Could not fetch profile:", err);
            if (superUser) {
                set({
                    tier: "Oracle",
                    user: {
                        ...auth.currentUser,
                        isSuperAdmin: true,
                        isAdmin: true,
                        isModerator: true
                    }
                });
            } else if (auth.currentUser) {
                const prev = get().user;
                set({
                    user: {
                        ...auth.currentUser,
                        ...(prev && prev.uid === auth.currentUser.uid ? prev : {}),
                    },
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
    login: async () => {
        set({ isAuthLoading: true });
        try {
            const provider = new GoogleAuthProvider();
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
            set({ user: null, balance: 0, reputation: 0, tier: "Newbie", bio: "", stakes: [] });
        } catch (error) {
            console.error("Logout failed", error);
        }
    },
    loginWithEmail: async (email, password) => {
        set({ isAuthLoading: true });
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            await cred.user.getIdToken(true);
            await get().fetchUserProfile();
        } catch (error) {
            set({ isAuthLoading: false });
            throw error;
        }
        set({ isAuthLoading: false });
    },
    registerWithEmail: async (email, password, username) => {
        set({ isAuthLoading: true });
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: username.trim() });
            try {
                await sendEmailVerification(user);
            } catch (verifyErr) {
                console.warn("[auth] sendEmailVerification failed (signup still succeeds):", verifyErr);
            }
            await user.getIdToken(true);
            await get().fetchUserProfile();
        } catch (error) {
            set({ isAuthLoading: false });
            throw error;
        }
        set({ isAuthLoading: false });
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
    updateProfile: async (updates) => {
        try {
            const { apiPatch } = await import("../../lib/api");
            const body = {};
            if (updates.displayName !== undefined) body.displayName = updates.displayName;
            if (updates.bio !== undefined) body.bio = updates.bio;
            if (updates.oracleHandle !== undefined) body.oracleHandle = updates.oracleHandle;
            if (Object.keys(body).length === 0) return false;
            const result = await apiPatch("/api/user/profile", body);
            if (result && !result.error) {
                set((state) => ({
                    bio: result.bio ?? updates.bio ?? state.bio,
                    user: state.user ? { ...state.user, ...result } : state.user,
                }));
                return true;
            }
            return false;
        } catch (err) {
            console.error("Failed to update profile:", err);
            return false;
        }
    },
    updateSettings: async (newSettings) => {
        try {
            const { apiPatch } = await import("../../lib/api");
            const currentSettings = get().settings || {};
            const mergedSettings = { ...currentSettings, ...newSettings };
            
            // Persist to backend
            const result = await apiPatch("/api/user/profile", { settings: mergedSettings });
            
            if (result && !result.error) {
                set({ settings: mergedSettings });
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to update settings:', err);
            return false;
        }
    }
});
