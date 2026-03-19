import { db } from "../db/index";
import { sql } from "drizzle-orm";

async function productionReset() {
    console.log("🚀 Starting Definitive Production Reset...");

    try {
        const targetEmail = "peterjohn2343@gmail.com";

        // 1. CONSOLIDATION
        console.log(`🔗 Consolidating 'Oracle_1'...`);
        await db.execute(sql`DELETE FROM users WHERE display_name ILIKE 'Oracle_1'`);
        console.log("✅ Oracle_1 removed.");

        // 2. DATA PURGE (Verified Table List)
        const tablesToClear = [
            'votes', 'stakes', 'transactions', 'market_activity',
            'notifications', 'comments', 'epoch_snapshots', 'platform_revenue'
        ];

        console.log("🧹 Purging engagement and financial data...");
        for (const table of tablesToClear) {
            try {
                await db.execute(sql.raw(`DELETE FROM ${table}`));
                console.log(`- Cleared ${table}`);
            } catch (e) {
                console.warn(`- Skip ${table}: ${e.message}`);
            }
        }

        // 3. MARKET DATA RESET
        console.log("📊 Resetting item performance metrics...");
        await db.execute(sql`
      UPDATE items SET 
        score = 0, 
        total_votes = 0, 
        rank = 50, 
        velocity = 0, 
        momentum = 0, 
        trend = '[]'::jsonb,
        is_dampened = false,
        status = 'active'
    `);

        // Reset market_meta
        await db.execute(sql`UPDATE market_meta SET total_staked = 0, platform_revenue = 0, item_exposure = '{}'::jsonb`);
        console.log("✅ Market metrics normalized.");

        // 4. LEDGER RESET
        console.log(`💰 Provisioning ${targetEmail} ($1,000 / 100 PV)...`);
        await db.execute(sql`UPDATE users SET balance = 1000, power_votes = 100 WHERE email = ${targetEmail}`);
        await db.execute(sql`UPDATE users SET balance = 0, power_votes = 0 WHERE email != ${targetEmail} AND (is_admin = false OR is_admin IS NULL)`);
        console.log("✅ Ledger reset complete.");

        console.log("\n✨ STAR RANKER IS READY FOR PRODUCTION.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Reset failed:", error);
        process.exit(1);
    }
}

productionReset();
