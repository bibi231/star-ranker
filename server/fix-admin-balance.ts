import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as fs from "fs";
config({ path: ".env.vercel.prod" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function fix() {
    let rate = 1500;
    try {
        const res = await fetch("https://star-ranker.onrender.com/api/currency/rates");
        const json = await res.json();
        if (json.NGN_USD) rate = 1 / json.NGN_USD;
    } catch (e) {
        console.log("Failed to fetch live rate, using default 1500.");
    }

    const balanceUsd = 100000 / rate;

    await pool.query("UPDATE users SET balance = $1 WHERE email = 'peterjohn2343@gmail.com'", [balanceUsd]);

    const admins = await pool.query("SELECT email, display_name as name, balance, tier, is_admin FROM users WHERE is_admin = true OR tier = 'Oracle' ORDER BY created_at ASC");

    fs.writeFileSync('server/admin_output.json', JSON.stringify({ rate, balanceUsd, admins: admins.rows }, null, 2));

    console.log("Updated balance and wrote details to server/admin_output.json");
    process.exit(0);
}

fix().catch(console.error);
