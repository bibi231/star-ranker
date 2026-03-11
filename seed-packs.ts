import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './server/db/schema';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
    console.log('Seeding vote packs...');
    await db.insert(schema.votePacks).values([
        { name: 'Basic', votes: 10, priceNgn: 1500, active: true },
        { name: 'Pro', votes: 50, priceNgn: 5000, active: true },
        { name: 'Elite', votes: 200, priceNgn: 15000, active: true },
        { name: 'Whale', votes: 1000, priceNgn: 50000, active: true }
    ]).onConflictDoNothing();
    console.log('Done resolving packs!');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
