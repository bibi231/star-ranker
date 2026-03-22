/**
 * System-core access (Ops Overwatch, seed, killswitch, ledger, etc.).
 * Set SUPER_ADMIN_EMAILS on the server (comma-separated, case-insensitive).
 */
export function getSuperAdminEmails(): string[] {
    const raw = process.env.SUPER_ADMIN_EMAILS?.trim() || "peterjohn2343@gmail.com";
    return raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

export function isSuperAdminEmail(email: string | undefined | null): boolean {
    if (!email) return false;
    return getSuperAdminEmails().includes(email.trim().toLowerCase());
}
