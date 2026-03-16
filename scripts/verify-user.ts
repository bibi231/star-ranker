import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import path from 'path';

dotenv.config({ path: '.env.vercel.prod' });

async function verify() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('Querying for user: peterjohn2343@gmail.com');
        const { rows } = await pool.query("SELECT id, email, firebase_uid, balance, is_admin FROM users WHERE email = 'peterjohn2343@gmail.com'");
        console.log('Results:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error('Error during verification:', e);
    } finally {
        await pool.end();
    }
}

verify();
