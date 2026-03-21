import 'dotenv/config';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("Applying schema changes directly via SQL to bypass interactive prompts...");

    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS admin_config (
                id SERIAL PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                killswitch BOOLEAN DEFAULT false,
                epochs_paused BOOLEAN DEFAULT false,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ admin_config table verified/created.");

        // Insert default row
        await db.execute(sql`
            INSERT INTO admin_config (key, killswitch, epochs_paused)
            VALUES ('global_state', false, false)
            ON CONFLICT (key) DO NOTHING;
        `);
        console.log("✅ Default admin_config row verified/created.");

        await db.execute(sql`
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
        `);
        console.log("✅ notifications.metadata column verified/added.");

        // Try adding the oracle handle unique constraint if it doesn't exist
        try {
            await db.execute(sql`
                ALTER TABLE users ADD CONSTRAINT users_oracle_handle_unique UNIQUE (oracle_handle);
            `);
            console.log("✅ Added unique constraint on oracle_handle");
        } catch (e: any) {
            console.log("ℹ️ Constraint on oracle_handle might already exist or failed (safe to ignore):", e.message);
        }

        console.log("\n🚀 Schema successfully synced!");
    } catch (error: any) {
        console.error("❌ Error applying schema:", error.message);
    }

    process.exit(0);
}

main();
