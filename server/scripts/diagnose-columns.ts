import { db } from "../db/index";
import { sql } from "drizzle-orm";

async function diagnose() {
    try {
        console.log("🔍 Fetching actual column names for 'users' table...");
        const res = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
        console.log("Users Columns:", res.rows.map(r => r.column_name));

        console.log("\n🔍 Fetching actual column names for 'items' table...");
        const res2 = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'items'`);
        console.log("Items Columns:", res2.rows.map(r => r.column_name));

        process.exit(0);
    } catch (e) {
        console.error("❌ Diagnostics failed:", e);
        process.exit(1);
    }
}

diagnose();
