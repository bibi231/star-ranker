import "dotenv/config";
import { db } from "../db/index";
import { users, stakes, transactions, marketActivity } from "../db/schema";
import { eq, sql } from "drizzle-orm";

async function resetLedger() {
    console.log("🚀 Starting Financial Ledger Reset...");

    try {
        // 1. Clear stakes
        console.log("🧹 Clearing all active and settled stakes...");
        await db.delete(stakes);

        // 2. Clear transactions
        console.log("🧹 Clearing transaction history...");
        await db.delete(transactions);

        // 3. Clear market activity
        console.log("🧹 Clearing market activity logs...");
        await db.delete(marketActivity);

        // 4. Reset all user balances to 0
        console.log("📉 Resetting all user balances to 0...");
        await db.update(users).set({
            balance: 0,
            referralEarnings: 0
        });

        // 5. Fund the Beetrus super account ($1,000)
        console.log("💰 Funding peterjohn2343@gmail.com with $1,000...");
        const targetEmail = 'peterjohn2343@gmail.com';

        await db.update(users)
            .set({ balance: 1000 })
            .where(eq(users.email, targetEmail));

        console.log("✅ Ledger reset complete. Production state synchronized.");
    } catch (error) {
        console.error("❌ Reset failed:", error);
        process.exit(1);
    }
}

resetLedger().then(() => process.exit(0));
