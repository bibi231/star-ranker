import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config({ path: '.env.vercel.prod' });

async function syncBalance() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('Searching for all records for: peterjohn2343@gmail.com');
        const { rows } = await pool.query("SELECT id, email, firebase_uid, balance FROM users WHERE email = 'peterjohn2343@gmail.com'");

        console.log('All user records found:', JSON.stringify(rows, null, 2));

        if (rows.length > 1) {
            console.log('Detected duplicate accounts. Consolidating balance...');
            const totalBalance = rows.reduce((acc, row) => acc + parseFloat(row.balance || 0), 0);
            const activeUid = rows[rows.length - 1].firebase_uid; // Assume the latest created one is active

            console.log(`Setting balance ${totalBalance} for UID: ${activeUid}`);
            await pool.query("UPDATE users SET balance = $1 WHERE firebase_uid = $2", [totalBalance, activeUid]);

            // To be safe, also set balance to 0 for others to avoid confusion if তারা log in with old ones (unlikely in Firebase but possible)
            for (let i = 0; i < rows.length - 1; i++) {
                await pool.query("UPDATE users SET balance = 0 WHERE id = $1", [rows[i].id]);
            }
            console.log('Consolidation complete.');
        } else if (rows.length === 1 && rows[0].balance < 72.2) {
            console.log('Found only one account but balance is low. Fixing...');
            await pool.query("UPDATE users SET balance = 72.2 WHERE email = 'peterjohn2343@gmail.com'");
            console.log('Balance fixed to 72.2 USD (~100,000 NGN)');
        } else {
            console.log('No consolidation needed or only one account with correct balance found.');
        }
    } catch (e) {
        console.error('Error during sync:', e);
    } finally {
        await pool.end();
    }
}

syncBalance();
