import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { firstPostgresSqlstate, formatDbConnectError } from "../lib/formatDbError";

const connectionString = process.env.DATABASE_URL?.trim() ?? "";

const pool = new Pool({
    // Placeholder only when unset so the process can boot; probePostgres() rejects before connect.
    connectionString: connectionString || "postgresql://_:_@127.0.0.1:65534/_",
    connectionTimeoutMillis: 10000,
    max: 20, // Limit connections to prevent overwhelming Neon free tier
});

export const db = drizzle(pool, { schema });

export type DbProbeResult =
    | { ok: true }
    | { ok: false; detail: string; pgCode?: string };

/** Single connection attempt; use for health endpoint and detailed errors. */
export async function probePostgres(): Promise<DbProbeResult> {
    if (!process.env.DATABASE_URL?.trim()) {
        return { ok: false, detail: "DATABASE_URL is not set", pgCode: undefined };
    }
    try {
        const client = await pool.connect();
        await client.query("SELECT 1");
        client.release();
        return { ok: true };
    } catch (err) {
        const detail = formatDbConnectError(err);
        const pgCode = firstPostgresSqlstate(err);
        return { ok: false, detail, pgCode };
    }
}

/** Neon cold-start / resume: retry before declaring failure. */
export async function probePostgresWithRetry(
    maxAttempts = 5,
    delayMs = 2500
): Promise<DbProbeResult> {
    let last: DbProbeResult = { ok: false, detail: "no attempts" };
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        last = await probePostgres();
        if (last.ok) return last;
        console.warn(`[DB] Connection attempt ${attempt}/${maxAttempts} failed: ${last.detail}`);
        if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
    return last;
}

/** Simple boolean for routes that only need ok / not ok. */
export async function checkDbHealth(): Promise<boolean> {
    const r = await probePostgres();
    if (!r.ok) {
        console.error("[DB] Health check failed:", r.detail);
    }
    return r.ok;
}
