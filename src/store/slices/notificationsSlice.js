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

export const createNotificationsSlice = (set, get) => ({
    notifications: [],
    reputationHistory: [],
    fetchNotifications: async () => {
        try {
            const data = await apiGet("/api/notifications");
            set({ notifications: data || [] });
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    },
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
            const { apiPatch } = await import("../../lib/api");
            await apiPatch(`/api/notifications/${id}/read`, {});
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
            const { apiPatch } = await import("../../lib/api");
            await apiPatch("/api/notifications/read-all", {});
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, read: true })),
            }));
        } catch (error) {
            console.error("Failed to mark all alerts as read:", error);
        }
    }
});
