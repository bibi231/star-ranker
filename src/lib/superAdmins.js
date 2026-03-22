/**
 * Must match server SUPER_ADMIN_EMAILS for UI gates. Vite: VITE_SUPER_ADMIN_EMAILS (comma-separated).
 */
const DEFAULT = "peterjohn2343@gmail.com";

export function getSuperAdminEmails() {
    const raw =
        typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPER_ADMIN_EMAILS
            ? String(import.meta.env.VITE_SUPER_ADMIN_EMAILS)
            : DEFAULT;
    return raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

export function isSuperAdminEmail(email) {
    if (!email || typeof email !== "string") return false;
    return getSuperAdminEmails().includes(email.trim().toLowerCase());
}
