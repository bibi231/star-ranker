/**
 * Admin Middleware for Star Ranker Cloud Functions
 * 
 * Provides RBAC enforcement and audit logging for all admin operations.
 */

import * as admin from "firebase-admin";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

// Initialize Firestore reference
const db = admin.firestore();

// ============================
// RBAC Types
// ============================

export interface AdminContext {
    uid: string;
    email: string;
    isAdmin: boolean;
    tier: string;
}

export interface AuditEntry {
    timestamp: number;
    action: string;
    actorUid: string;
    actorEmail: string;
    targetType: string;
    targetId: string;
    details: Record<string, any>;
    success: boolean;
    errorMessage?: string;
}

// ============================
// Authentication & Authorization
// ============================

/**
 * Validates that the request has a valid Firebase Auth token
 * and the user has Oracle tier (admin) privileges.
 */
export async function requireOracle(request: CallableRequest): Promise<AdminContext> {
    // 1. Check for authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required for admin operations.");
    }

    const { uid, token } = request.auth;
    const email = token.email || "";

    // 2. Fetch user document from Firestore to verify tier
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
        throw new HttpsError("permission-denied", "User profile not found.");
    }

    const userData = userDoc.data();
    const tier = userData?.tier || "Newbie";

    // 3. Check for admin claim OR Oracle tier
    const isAdmin = token.admin === true || tier === "Oracle";

    if (!isAdmin) {
        await auditLog({
            action: "UNAUTHORIZED_ADMIN_ACCESS",
            actorUid: uid,
            actorEmail: email,
            targetType: "system",
            targetId: "admin_panel",
            details: { attemptedTier: tier },
            success: false,
            errorMessage: "Insufficient privileges"
        });
        throw new HttpsError("permission-denied", "Oracle tier required for admin operations.");
    }

    return {
        uid,
        email,
        isAdmin: true,
        tier
    };
}

/**
 * Validates that the user has at least Sage tier (moderator level)
 */
export async function requireSage(request: CallableRequest): Promise<AdminContext> {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { uid, token } = request.auth;
    const email = token.email || "";

    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const tier = userData?.tier || "Newbie";

    const allowedTiers = ["Sage", "Oracle"];
    if (!allowedTiers.includes(tier) && token.admin !== true) {
        throw new HttpsError("permission-denied", "Sage or Oracle tier required.");
    }

    return {
        uid,
        email,
        isAdmin: tier === "Oracle" || token.admin === true,
        tier
    };
}

// ============================
// Audit Logging
// ============================

/**
 * Creates an immutable audit log entry for admin actions
 */
export async function auditLog(entry: Omit<AuditEntry, "timestamp">): Promise<string> {
    const auditEntry: AuditEntry = {
        ...entry,
        timestamp: Date.now()
    };

    const docRef = await db.collection("admin_audit_logs").add(auditEntry);
    return docRef.id;
}

/**
 * Wrapper function for admin operations with automatic audit logging
 */
export async function withAudit<T>(
    admin: AdminContext,
    action: string,
    targetType: string,
    targetId: string,
    operation: () => Promise<T>
): Promise<T> {
    try {
        const result = await operation();

        await auditLog({
            action,
            actorUid: admin.uid,
            actorEmail: admin.email,
            targetType,
            targetId,
            details: { result: typeof result === 'object' ? result : { value: result } },
            success: true
        });

        return result;
    } catch (error: any) {
        await auditLog({
            action,
            actorUid: admin.uid,
            actorEmail: admin.email,
            targetType,
            targetId,
            details: {},
            success: false,
            errorMessage: error.message || "Unknown error"
        });
        throw error;
    }
}

// ============================
// Rate Limiting (Optional)
// ============================

const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_ADMIN_ACTIONS_PER_MINUTE = 30;

const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(uid: string): boolean {
    const now = Date.now();
    const entry = rateLimitCache.get(uid);

    if (!entry || now > entry.resetAt) {
        rateLimitCache.set(uid, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count >= MAX_ADMIN_ACTIONS_PER_MINUTE) {
        return false;
    }

    entry.count++;
    return true;
}
