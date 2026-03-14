import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

// Initialize Firebase Admin (for token verification only — no Cloud Functions needed)
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "star-ranker",
    });
}

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
