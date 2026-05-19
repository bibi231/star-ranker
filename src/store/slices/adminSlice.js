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

export const createAdminSlice = (set, get) => ({
    adminState: {
        killswitch: false,
        epochsPaused: false,
        frozenMarkets: {},
        lockedItems: {}
    },
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
    seedDatabase: async () => {
        try {
            const result = await apiPost("/api/admin/seed", {}, { timeoutMs: 180000, retries: 0 });
            return result;
        } catch (error) {
            console.error("Seed error:", error);
            throw error;
        }
    }
});
