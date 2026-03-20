import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

/**
 * Firebase Admin — verifyIdToken needs real credentials on Render / non-GCP hosts.
 * Set FIREBASE_SERVICE_ACCOUNT_JSON to the full JSON of a Firebase service account (single line in env).
 */
function initFirebaseAdmin() {
    if (admin.apps.length) return;

    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (rawJson) {
        try {
            const sa = JSON.parse(rawJson) as { project_id?: string; client_email?: string };
            admin.initializeApp({
                credential: admin.credential.cert(sa as admin.ServiceAccount),
                projectId: sa.project_id || "star-ranker",
            });
            console.log("[auth] Firebase Admin initialized with service account");
            return;
        } catch (e) {
            console.error("[auth] FIREBASE_SERVICE_ACCOUNT_JSON parse failed:", e);
        }
    }

    admin.initializeApp({ projectId: "star-ranker" });
    console.warn(
        "[auth] Firebase Admin using projectId only — set FIREBASE_SERVICE_ACCOUNT_JSON on Render or verifyIdToken will fail."
    );
}

initFirebaseAdmin();

export interface AuthRequest extends Request {
    uid?: string;
    userEmail?: string;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Sets req.uid and req.userEmail on success.
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.uid = decoded.uid;
        req.userEmail = decoded.email;
        (req as any).userName = decoded.name; // Capture display name if present
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

/**
 * Optional auth — sets uid if token present, but doesn't block.
 */
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
        try {
            const decoded = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
            req.uid = decoded.uid;
            req.userEmail = decoded.email;
            (req as any).userName = decoded.name; // Capture display name if present
        } catch {
            // Token invalid — proceed without auth
        }
    }

    next();
}
