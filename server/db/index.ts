import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
    max: 20, // Limit connections to prevent overwhelming Neon free tier
});

export const db = drizzle(pool, { schema });

// Helper to check DB health
export async function checkDbHealth() {
    try {
        const client = await pool.connect();
        await client.query("SELECT 1");
        client.release();
        return true;
    } catch (err) {
        console.error("[DB] Health check failed:", err);
        return false;
    }
}
