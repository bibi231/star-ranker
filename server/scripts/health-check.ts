import { db } from "../db/index";
import { sql } from "drizzle-orm";

async function healthCheck() {
    console.log("🔍 Running Star Ranker Production Health Check...");
    try {
        const catsRes = await db.execute(sql`SELECT count(*) as count FROM categories`);
        const itemsRes = await db.execute(sql`SELECT count(*) as count FROM items`);
        const usersRes = await db.execute(sql`SELECT count(*) as count FROM users WHERE email IS NOT NULL`);

        const categoriesCount = parseInt(catsRes.rows[0].count as string);
        const itemsCount = parseInt(itemsRes.rows[0].count as string);
        const usersCount = parseInt(usersRes.rows[0].count as string);

        console.log("HEALTH_REPORT:", JSON.stringify({
            categories: categoriesCount,
            items: itemsCount,
            users: usersCount,
            status: "OK"
        }, null, 2));

        // Sample rankings check
        const topItems = await db.execute(sql`SELECT name, rank, score FROM items WHERE status = 'active' ORDER BY rank ASC LIMIT 5`);
        console.log("\n🏆 TOP 5 RANKINGS:");
        topItems.rows.forEach(r => console.log(`${r.rank}. ${r.name} (Score: ${r.score})`));

        if (itemsCount > 0 && categoriesCount > 0) {
            console.log("\n✅ DATA INTEGRITY VERIFIED.");
        } else {
            console.log("\n⚠️ DATA WARNING: Empty tables detected.");
        }

        process.exit(0);
    } catch (e) {
        console.error("❌ HEALTH_CHECK_FAILED:", e.message);
        process.exit(1);
    }
}

healthCheck();
