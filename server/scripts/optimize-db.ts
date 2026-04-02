import { db } from "../db/index";
import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const sqlPath = path.join(__dirname, "optimize-db.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    
    // Split by -- comments and semilcons if needed, or just run the whole thing if the driver supports it
    // Most PG drivers handle individual statements best. 
    const statements = sqlContent
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));

    console.log(`🚀 Executing ${statements.length} optimization statements...`);

    for (const statement of statements) {
        try {
            console.log(`📡 Applying: ${statement.substring(0, 50)}...`);
            await db.execute(sql.raw(statement));
        } catch (err: any) {
            console.error(`❌ Statement failed:`, err.message);
        }
    }

    console.log("✅ Database performance indexing complete.");
    process.exit(0);
}

main().catch(err => {
    console.error("FATAL:", err);
    process.exit(1);
});
