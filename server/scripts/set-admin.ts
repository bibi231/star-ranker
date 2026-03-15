import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const sql = neon(process.env.DATABASE_URL!);

    // Set admin balance
    await sql`UPDATE users SET balance = 100000 WHERE email = 'peterjohn2343@gmail.com'`;

    // Verify
    const rows = await sql`SELECT id, email, balance, is_admin, oracle_handle FROM users WHERE email = 'peterjohn2343@gmail.com'`;
    console.log('Result:', JSON.stringify(rows, null, 2));
}
run().catch(console.error);
