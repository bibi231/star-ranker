import "dotenv/config";
import { db } from "../server/db/index";
import { users, votes, stakes } from "../server/db/schema";

async function maintenance() {
    console.log("🚀 [BETA-PREP] Initializing Star Ranker Production Economy...");

    try {
        // 1. Purge Activity
        console.log("💣 Purging global voting and staking telemetry...");
        await db.delete(votes);
        await db.delete(stakes);

        // 2. Reset User Accounts
        console.log("📉 Normalizing all user account parameters...");
        await db.update(users).set({
            balance: 10000,
            reputation: 100,
            tier: "Initiate",
            powerVotes: 0,
            referralEarnings: 0
        });

        console.log("✅ [SUCCESS] Star Ranker is now calibrated for public Beta.");
        process.exit(0);
    } catch (error) {
        console.error("❌ [FATAL] Maintenance sequence aborted:", error);
        process.exit(1);
    }
}

maintenance();
