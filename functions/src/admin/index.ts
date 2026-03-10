/**
 * Admin Cloud Functions for Star Ranker
 * 
 * All functions are protected by RBAC middleware and audit logged.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { requireOracle, requireSage, withAudit, checkRateLimit } from "./middleware";
import { reifyRankings } from "../rankingEngine";

const db = admin.firestore();

// ============================
// Market Operations
// ============================

/**
 * Freeze or unfreeze a market category
 */
export const setMarketStatus = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    if (!checkRateLimit(adminCtx.uid)) {
        throw new HttpsError("resource-exhausted", "Rate limit exceeded. Try again later.");
    }

    const { categorySlug, frozen, reason } = request.data;

    if (!categorySlug || typeof frozen !== "boolean") {
        throw new HttpsError("invalid-argument", "categorySlug and frozen (boolean) are required.");
    }

    return withAudit(adminCtx, frozen ? "MARKET_FREEZE" : "MARKET_UNFREEZE", "category", categorySlug, async () => {
        const categoryRef = db.collection("categories").where("slug", "==", categorySlug);
        const snapshot = await categoryRef.get();

        if (snapshot.empty) {
            throw new HttpsError("not-found", `Category '${categorySlug}' not found.`);
        }

        const doc = snapshot.docs[0];
        await doc.ref.update({
            isFrozen: frozen,
            frozenAt: frozen ? Date.now() : null,
            frozenReason: frozen ? reason : null,
            frozenBy: frozen ? adminCtx.uid : null
        });

        return { success: true, categorySlug, frozen };
    });
});

/**
 * Manually trigger a market snapshot
 */
export const triggerSnapshot = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    if (!checkRateLimit(adminCtx.uid)) {
        throw new HttpsError("resource-exhausted", "Rate limit exceeded.");
    }

    const { categorySlug } = request.data;

    if (!categorySlug) {
        throw new HttpsError("invalid-argument", "categorySlug is required.");
    }

    return withAudit(adminCtx, "MANUAL_SNAPSHOT", "category", categorySlug, async () => {
        // Fetch category
        const catQuery = await db.collection("categories").where("slug", "==", categorySlug).get();
        if (catQuery.empty) {
            throw new HttpsError("not-found", `Category '${categorySlug}' not found.`);
        }
        const catDoc = catQuery.docs[0];

        // Fetch items for this category
        const itemsQuery = await db.collection("items").where("categoryId", "==", catDoc.id).get();
        const rankingItems = itemsQuery.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // Reify rankings
        const updatedRankings = reifyRankings(rankingItems);

        // Create snapshot
        const snapshotRef = await db.collection("snapshots").add({
            categorySlug,
            timestamp: Date.now(),
            rankData: JSON.stringify(updatedRankings.map(i => ({ id: i.id, score: i.score, rank: updatedRankings.indexOf(i) + 1 }))),
            triggeredBy: adminCtx.uid,
            isManual: true
        });

        return { success: true, snapshotId: snapshotRef.id };
    });
});

/**
 * Adjust market viscosity (ranking sensitivity)
 */
export const adjustMarketViscosity = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    const { categorySlug, viscosity } = request.data;

    if (!categorySlug || typeof viscosity !== "number" || viscosity < 0.1 || viscosity > 10) {
        throw new HttpsError("invalid-argument", "categorySlug and viscosity (0.1-10) are required.");
    }

    return withAudit(adminCtx, "ADJUST_VISCOSITY", "category", categorySlug, async () => {
        const catQuery = await db.collection("categories").where("slug", "==", categorySlug).get();
        if (catQuery.empty) {
            throw new HttpsError("not-found", `Category '${categorySlug}' not found.`);
        }

        await catQuery.docs[0].ref.update({ viscosity });
        return { success: true, categorySlug, viscosity };
    });
});

// ============================
// User Moderation
// ============================

/**
 * Flag a user for review
 */
export const flagUser = onCall(async (request) => {
    const adminCtx = await requireSage(request);

    const { targetUid, reason, severity } = request.data;

    if (!targetUid || !reason) {
        throw new HttpsError("invalid-argument", "targetUid and reason are required.");
    }

    return withAudit(adminCtx, "USER_FLAG", "user", targetUid, async () => {
        await db.collection("user_flags").add({
            targetUid,
            flaggedBy: adminCtx.uid,
            reason,
            severity: severity || "medium",
            timestamp: Date.now(),
            resolved: false
        });

        return { success: true, targetUid };
    });
});

/**
 * Apply vote dampening to a user
 */
export const dampenUser = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    const { targetUid, dampeningFactor, durationHours, reason } = request.data;

    if (!targetUid || typeof dampeningFactor !== "number") {
        throw new HttpsError("invalid-argument", "targetUid and dampeningFactor are required.");
    }

    return withAudit(adminCtx, "USER_DAMPEN", "user", targetUid, async () => {
        const userRef = db.collection("users").doc(targetUid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new HttpsError("not-found", `User '${targetUid}' not found.`);
        }

        await userRef.update({
            dampeningFactor: Math.max(0, Math.min(1, dampeningFactor)),
            dampenedUntil: durationHours ? Date.now() + (durationHours * 3600000) : null,
            dampenedReason: reason
        });

        return { success: true, targetUid, dampeningFactor };
    });
});

/**
 * Ban a user from the platform
 */
export const banUser = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    const { targetUid, reason, permanent } = request.data;

    if (!targetUid || !reason) {
        throw new HttpsError("invalid-argument", "targetUid and reason are required.");
    }

    return withAudit(adminCtx, "USER_BAN", "user", targetUid, async () => {
        // Update user document
        await db.collection("users").doc(targetUid).update({
            isBanned: true,
            bannedAt: Date.now(),
            bannedBy: adminCtx.uid,
            banReason: reason,
            banPermanent: permanent || false
        });

        // Disable Firebase Auth account
        try {
            await admin.auth().updateUser(targetUid, { disabled: true });
        } catch (error) {
            console.error("Failed to disable auth account:", error);
        }

        return { success: true, targetUid };
    });
});

// ============================
// Settlement & Integrity
// ============================

/**
 * Force settlement of a specific stake
 */
export const forceSettleStake = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    const { stakeId, outcome, reason } = request.data;

    if (!stakeId || !outcome || !reason) {
        throw new HttpsError("invalid-argument", "stakeId, outcome, and reason are required.");
    }

    return withAudit(adminCtx, "FORCE_SETTLE", "stake", stakeId, async () => {
        const stakeRef = db.collection("stakes").doc(stakeId);
        const stakeDoc = await stakeRef.get();

        if (!stakeDoc.exists) {
            throw new HttpsError("not-found", `Stake '${stakeId}' not found.`);
        }

        const stake = stakeDoc.data()!;

        if (stake.isSettled) {
            throw new HttpsError("failed-precondition", "Stake is already settled.");
        }

        // Calculate payout based on outcome
        let payout = 0;
        if (outcome === "win") {
            payout = stake.amount * 5;
        } else if (outcome === "partial") {
            payout = stake.amount * 1.5;
        }

        // Update stake
        await stakeRef.update({
            isSettled: true,
            settlementDate: Date.now(),
            forcedBy: adminCtx.uid,
            forceReason: reason,
            payout,
            outcome
        });

        // Update user balance if payout > 0
        if (payout > 0) {
            const userRef = db.collection("users").doc(stake.userId);
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const currentBalance = userDoc.data()?.balance || 0;
                transaction.update(userRef, { balance: currentBalance + payout });
            });
        }

        return { success: true, stakeId, payout };
    });
});

/**
 * Get admin audit logs
 */
export const getAuditLogs = onCall(async (request) => {
    // Verify admin access (throws if not authorized)
    await requireOracle(request);

    const { limit = 50, action, targetType } = request.data;

    let query = db.collection("admin_audit_logs")
        .orderBy("timestamp", "desc")
        .limit(Math.min(limit, 200));

    if (action) {
        query = query.where("action", "==", action);
    }
    if (targetType) {
        query = query.where("targetType", "==", targetType);
    }

    const snapshot = await query.get();

    return {
        logs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        count: snapshot.size
    };
});

// ============================
// Data Operations
// ============================

/**
 * Trigger data ingestor manually
 */
export const triggerIngestor = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    const { ingestorType } = request.data;

    const validIngestors = ["crypto", "smartphones", "music", "websites", "tech"];
    if (!validIngestors.includes(ingestorType)) {
        throw new HttpsError("invalid-argument", `Invalid ingestor type. Valid: ${validIngestors.join(", ")}`);
    }

    return withAudit(adminCtx, "TRIGGER_INGESTOR", "ingestor", ingestorType, async () => {
        // In production, this would trigger the actual ingestor
        // For now, we just log the action
        await db.collection("ingestor_runs").add({
            type: ingestorType,
            triggeredBy: adminCtx.uid,
            timestamp: Date.now(),
            status: "pending"
        });

        return { success: true, ingestorType, status: "triggered" };
    });
});

/**
 * Emergency stop for the entire platform
 */
export const emergencyKillswitch = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    const { active, reason } = request.data;
    if (typeof active !== "boolean") {
        throw new HttpsError("invalid-argument", "active (boolean) is required.");
    }

    return withAudit(adminCtx, active ? "KILLSWITCH_ACTIVATE" : "KILLSWITCH_DEACTIVATE", "system", "platform", async () => {
        await db.collection("settings").doc("platform").set({
            isKilled: active,
            killedAt: active ? Date.now() : null,
            killedBy: active ? adminCtx.uid : null,
            killedReason: active ? reason : "Restored by admin"
        }, { merge: true });

        return { success: true, isKilled: active };
    });
});

/**
 * Shadow ban a user (silent vote nullification)
 */
export const shadowBanUser = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    const { targetUid, reason } = request.data;
    if (!targetUid || !reason) {
        throw new HttpsError("invalid-argument", "targetUid and reason are required.");
    }

    return withAudit(adminCtx, "USER_SHADOW_BAN", "user", targetUid, async () => {
        await db.collection("users").doc(targetUid).update({
            isShadowBanned: true,
            shadowBannedAt: Date.now(),
            shadowBannedBy: adminCtx.uid,
            shadowBanReason: reason
        });

        return { success: true, targetUid };
    });
});

/**
 * Get system health stats for admin dashboard
 */
export const getSystemStats = onCall(async (request) => {
    // ... existing implementation
    // Verify admin access (throws if not authorized)
    await requireOracle(request);

    // Fetch counts
    const [users, categories, items, stakes, votes] = await Promise.all([
        db.collection("users").count().get(),
        db.collection("categories").count().get(),
        db.collection("items").count().get(),
        db.collection("stakes").count().get(),
        db.collection("votes").count().get()
    ]);

    // Get recent audit log count
    const oneDayAgo = Date.now() - 86400000;
    const recentAudits = await db.collection("admin_audit_logs")
        .where("timestamp", ">", oneDayAgo)
        .count()
        .get();

    return {
        userCount: users.data().count,
        categoryCount: categories.data().count,
        itemCount: items.data().count,
        stakeCount: stakes.data().count,
        voteCount: votes.data().count,
        adminActionsToday: recentAudits.data().count
    };
});

/**
 * Toggle global epoch progression
 */
export const toggleEpochProgression = onCall(async (request) => {
    const adminCtx = await requireOracle(request);
    const { isPaused } = request.data;

    return withAudit(adminCtx, isPaused ? "EPOCH_PAUSE" : "EPOCH_RESUME", "platform", "settings", async () => {
        await db.collection("settings").doc("platform").set({ isEpochPaused: isPaused }, { merge: true });
        return { success: true, isPaused };
    });
});

/**
 * Manually force an immediate epoch transition (Rollover)
 */
export const forceEpochRollover = onCall(async (request) => {
    const adminCtx = await requireOracle(request);

    return withAudit(adminCtx, "FORCE_EPOCH_ROLLOVER", "platform", "epochs", async () => {
        const { manageEpochs } = await import("../epochs/manager.js");
        await manageEpochs(true);
        return { success: true, message: "Manual rollover initiated." };
    });
});
