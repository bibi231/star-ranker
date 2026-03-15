/**
 * Credit 100,000 NGN to peterjohn2343@gmail.com
 * Run: npx tsx server/scripts/credit-admin.ts
 */
import "dotenv/config";
import { db } from "../db/index";
import { users } from "../db/schema";
import { eq, sql } from "drizzle-orm";

const ADMIN_EMAIL = "peterjohn2343@gmail.com";
const CREDIT_USD = 100000 / 1500; // 100k NGN → USD at 1500 rate

async function main() {
    console.log(`Crediting $${CREDIT_USD.toFixed(2)} (₦100,000) to ${ADMIN_EMAIL}...`);

    const result = await db.update(users)
        .set({ balance: sql`${users.balance} + ${CREDIT_USD}` })
        .where(eq(users.email, ADMIN_EMAIL))
        .returning({ email: users.email, balance: users.balance });

    if (result.length === 0) {
        console.error("User not found!");
        process.exit(1);
    }

    console.log(`✅ Done! New balance: $${result[0].balance.toFixed(2)}`);
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
