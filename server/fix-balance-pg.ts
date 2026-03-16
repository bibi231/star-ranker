import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.vercel.prod" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function fix() {
    const res = await pool.query("UPDATE users SET balance = 100000 WHERE email = 'peterjohn2343@gmail.com' RETURNING *");
    console.log("Updated:", res.rows);
    process.exit(0);
}

fix().catch(console.error);
