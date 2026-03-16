import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.vercel.prod" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function checkAdmins() {
    const res = await pool.query("SELECT id, email, display_name, balance, reputation, tier, is_admin, is_moderator, created_at FROM users WHERE is_admin = true OR tier = 'Oracle'");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
}

checkAdmins().catch(console.error);
