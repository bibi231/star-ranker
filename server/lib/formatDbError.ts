/**
 * Drizzle/Neon wrap Postgres errors; walk `.cause` for the real message and SQLSTATE.
 */
export function formatDbConnectError(err: unknown): string {
    const parts: string[] = [];
    const seen = new Set<string>();
    let e: any = err;
    let depth = 0;
    while (e && depth < 12) {
        const msg = typeof e?.message === "string" ? e.message.trim() : "";
        const code = typeof e?.code === "string" ? e.code : "";
        const line = code && msg ? `${code}: ${msg}` : msg || code || "";
        if (line && !seen.has(line)) {
            seen.add(line);
            parts.push(line);
        }
        e = e?.cause;
        depth++;
    }
    if (parts.length === 0) return String(err);
    return parts.join(" → ");
}

/** First SQLSTATE in the chain (e.g. 28P01 = wrong password). */
export function firstPostgresSqlstate(err: unknown): string | undefined {
    let e: any = err;
    let depth = 0;
    while (e && depth < 12) {
        const code = e?.code;
        if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
            return code;
        }
        e = e?.cause;
        depth++;
    }
    return undefined;
}
