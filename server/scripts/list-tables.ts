import { db } from "../db/index";
import { sql } from "drizzle-orm";

async function checkTables() {
    try {
        const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        console.log("CONFIRMED TABLES:", JSON.stringify(res.rows.map(r => r.table_name), null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkTables();
