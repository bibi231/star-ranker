import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config({ path: '.env.vercel.prod' });

async function audit() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('--- USER AUDIT ---');
        const { rows } = await pool.query("SELECT id, email, firebase_uid, balance, is_admin FROM users ORDER BY id ASC LIMIT 100");
        console.log(JSON.stringify(rows, null, 2));

        console.log('\n--- SETTING MINIMUM BALANCE ---');
        // Bump everyone below $1 to $1
        const result = await pool.query("UPDATE users SET balance = 1.0 WHERE balance < 1.0::numeric");
        console.log(`Updated ${result.rowCount} users to $1 minimum.`);

        console.log('\n--- FIXING PETERJOHN ---');
        // Ensure peterjohn has at least 72.2
        await pool.query("UPDATE users SET balance = GREATEST(balance, 72.2) WHERE email = 'peterjohn2343@gmail.com'");
        console.log('PeterJohn balance verified/updated.');

    } catch (e) {
        console.error('Audit failed:', e);
    } finally {
        await pool.end();
    }
}

audit();
