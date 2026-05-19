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

export const createStakeSlice = (set, get) => ({
    votingHistory: [],
    stakes: [],
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
    placeStake: async (itemDocId, itemName, categorySlug, amount, target, betType) => {
        const { user, balance, demoBalance, isDemoMode } = get();
        if (!user) {
            toast.error("Please login to place a stake");
            return false;
        }

        const currentBalance = isDemoMode ? demoBalance : balance;

        if (currentBalance < amount) {
            toast.error(`Insufficient ${isDemoMode ? 'demo credits' : 'balance'}`);
            return false;
        }

        try {
            const res = await apiPost("/api/stakes", {
                itemDocId,
                itemName,
                categorySlug,
                amount,
                target,
                betType,
                isDemo: isDemoMode
            });

            if (res && res.success) {
                toast.success(isDemoMode ? "Demo stake placed! (Practice)" : "Stake placed successfully!");
                
                if (isDemoMode) {
                    set({ demoBalance: res.newDemoBalance || (demoBalance - amount) });
                } else {
                    set({ balance: balance - amount });
                }
                
                // Refresh stakes list
                get().fetchStakes();
                return true;
            } else {
                toast.error(res?.error || "Failed to place stake");
                return false;
            }
        } catch (err) {
            console.error("Stake error:", err);
            toast.error("Failed to place stake");
            return false;
        }
    },
    getLiveOdds: async (itemId, amount, targetRank, betType) => {
        try {
            const data = await apiGet("/api/stakes/odds", {
                itemDocId: itemId,
                amount: String(amount),
                target: typeof targetRank === 'object' ? JSON.stringify(targetRank) : String(targetRank),
                categorySlug: get().currentCategorySlug || 'crypto',
                betType,
            });
            return data;
        } catch (error) {
            console.error("[getLiveOdds] error:", error?.message || error);
            // ── Dynamic local fallback (mirrors server calculateBaseProbability) ──
            const item = get().items.find(i => i.docId === itemId);
            const currentRank = item?.rank ?? 50;
            const momentum = item?.momentum ?? 0;
            const velocity = item?.velocity ?? 0;
            const volatility = item?.volatility ?? 5;

            let targetRankValue = 50;
            if (betType === 'exact') {
                targetRankValue = typeof targetRank === 'number' ? targetRank : Number(targetRank) || 50;
            } else if (betType === 'range') {
                const t = typeof targetRank === 'object' ? targetRank : {};
                targetRankValue = ((t.min || 0) + (t.max || 100)) / 2;
            } else if (betType === 'directional') {
                const t = typeof targetRank === 'object' ? targetRank : {};
                targetRankValue = t.dir === 'up' ? currentRank - (t.k || 1) : currentRank + (t.k || 1);
            }

            const rankDelta = Math.abs(targetRankValue - currentRank);

            let pBase;
            if (betType === 'exact') {
                pBase = Math.max(0.01, 0.5 * Math.exp(-rankDelta * 0.15));
            } else if (betType === 'range') {
                pBase = Math.max(0.05, 0.7 * Math.exp(-rankDelta * 0.08));
            } else {
                // directional
                const t = typeof targetRank === 'object' ? targetRank : {};
                const movingRight = (t.dir === 'up' && velocity < 0) || (t.dir === 'down' && velocity > 0);
                pBase = movingRight
                    ? Math.min(0.85, 0.5 + Math.abs(velocity) * 0.02 + momentum * 0.01)
                    : Math.max(0.05, 0.3 - Math.abs(velocity) * 0.01);
            }

            // Volatility adjustment
            pBase *= (1 + volatility * 0.01);
            pBase = Math.min(0.95, Math.max(0.01, pBase));

            const mult = Math.min(8, 1 / pBase);
            // Slippage scales with stake size vs a $5k liquidity floor
            const slippage = Math.min(0.15, (amount || 10) / 5000);
            const effectiveMultiplier = Math.min(8, Math.max(1.05, mult * (1 - slippage) * 0.96));

            return {
                probability: pBase,
                multiplier: mult,
                effectiveMultiplier,
                slippage,
                potentialPayout: (amount || 10) * effectiveMultiplier,
                error: error?.message || 'local fallback',
            };
        }
    }
});
