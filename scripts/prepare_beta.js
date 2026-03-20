import { db } from "../server/db/index.js";
import { users, votes, stakes } from "../server/db/schema.js";

async function maintenance() {
    console.log("🚀 Starting Production Beta Maintenance...");

    try {
        // 1. Purge Activity (Votes and Stakes)
        console.log("💣 Purging old voting and staking history...");
        await db.delete(votes);
        await db.delete(stakes);

        // 2. Reset User Balances & Reputation
        console.log("📉 Resetting all user accounts to baseline...");
        await db.update(users).set({
            balance: 10000,
            reputation: 100,
            tier: "Initiate",
            powerVotes: 0,
            referralEarnings: 0
        });

        console.log("✅ Maintenance Complete. System is now Ready for Beta Testers.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Maintenance Failed:", error);
        process.exit(1);
    }
}

maintenance();
