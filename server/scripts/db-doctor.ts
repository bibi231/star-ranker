import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

async function doctor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL is not set.");
        return;
    }

    const pool = new Pool({ connectionString });
    const db = drizzle(pool);

    console.log("🛠 Starting DB Doctor...");

    try {
        // 1. Create market_activity table
        console.log("Adding 'market_activity' table...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "market_activity" (
                "id" serial PRIMARY KEY NOT NULL,
                "type" text NOT NULL,
                "user_id" text,
                "item_doc_id" text,
                "item_name" text,
                "category_slug" text,
                "amount" real,
                "description" text,
                "metadata" jsonb DEFAULT '{}'::jsonb,
                "created_at" timestamp DEFAULT now()
            );
        `);
        console.log("✅ 'market_activity' table ready.");

        // 2. Add indexes
        console.log("Adding indexes...");
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "market_activity_type_idx" ON "market_activity" ("type");`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "market_activity_created_idx" ON "market_activity" ("created_at");`);
        console.log("✅ Indexes ready.");

        // 3. Fix stakes.target type if needed (this was causing drizzle-kit push to fail)
        console.log("Ensuring 'stakes.target' is jsonb...");
        try {
            await db.execute(sql`ALTER TABLE "stakes" ALTER COLUMN "target" TYPE jsonb USING target::text::jsonb;`);
            console.log("✅ 'stakes.target' converted to jsonb.");
        } catch (e) {
            console.log("ℹ️ 'stakes.target' already jsonb or migration skipped.");
        }

        // 4. Add admin flags to users if missing
        console.log("Finalizing user table schema...");
        try { await db.execute(sql`ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false;`); } catch (e) { }
        try { await db.execute(sql`ALTER TABLE "users" ADD COLUMN "is_moderator" boolean DEFAULT false;`); } catch (e) { }
        console.log("✅ User schema aligned.");

    } catch (error) {
        console.error("❌ DB Doctor failed:", error);
    } finally {
        await pool.end();
        console.log("🏁 Done.");
    }
}

doctor();
