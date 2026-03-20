/**
 * Sync Users table schema by adding missing columns for user profile state
 * Run: npx tsx server/scripts/sync-schema.ts
 */
import "dotenv/config";
import { db } from "../db/index";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking and syncing users table schema...");

    try {
        // Add oracle_handle
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS oracle_handle VARCHAR(30) UNIQUE`);
        console.log("✅ oracle_handle synced");

        // Add pro_until
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_until TIMESTAMP`);
        console.log("✅ pro_until synced");

        // Add referral_earnings
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings REAL DEFAULT 0`);
        console.log("✅ referral_earnings synced");

        // Add oracle handle change-limit tracking
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS oracle_handle_change_count INTEGER DEFAULT 0`);
        console.log("✅ oracle_handle_change_count synced");

        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS oracle_handle_change_window_start TIMESTAMP`);
        console.log("✅ oracle_handle_change_window_start synced");

        console.log("🚀 Schema sync complete!");
    } catch (err) {
        console.error("❌ Schema sync failed:", err);
    }
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
