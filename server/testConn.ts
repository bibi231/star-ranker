import "dotenv/config";
import { db } from "./db/index";
import { sql } from "drizzle-orm";

async function testConn() {
    console.log("🔍 Checking database connection...");
    try {
        const result = await db.execute(sql`SELECT NOW()`);
        console.log("✅ Connection successful:", result);
        process.exit(0);
    } catch (err) {
        console.error("❌ Connection failed:", err);
        process.exit(1);
    }
}

testConn();
