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

export const createDemoSlice = (set, get) => ({
    demoBalance: 50000,
    isDemoMode: true,
    hasCompletedTour: false,
    demoStats: { stakesPlaced: 0, winsCount: 0, totalEarned: 0, winRate: 0 },
    showDemoConversion: false,
    setDemoMode: async (val) => {
        set({ isDemoMode: val });
        // Persist to backend if logged in
        if (get().user) {
            try {
                await apiPost('/api/user/profile', { isDemoMode: val }, { method: 'PATCH' });
            } catch (e) {
                console.error("Failed to persist demo mode:", e);
            }
        }
    },
    setShowDemoConversion: (val) => set({ showDemoConversion: val }),
    resetDemoBalance: async () => {
        set({ demoBalance: 50000, demoStats: { stakesPlaced: 0, winsCount: 0, totalEarned: 0, winRate: 0 } });
        if (get().user) {
            try {
                await apiPost('/api/demo/reset', {});
                toast.success("Practice balance reset to ★50,000");
            } catch (e) {
                console.error("Failed to reset demo balance:", e);
                toast.error("Failed to reset balance on server");
            }
        } else {
            toast.success("Practice balance reset to ★50,000");
        }
    }
});
