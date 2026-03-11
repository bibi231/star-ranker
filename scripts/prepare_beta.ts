import "dotenv/config";
import { db } from "../server/db/index";
import { users, betaInvites, votes, stakes } from "../server/db/schema";

async function maintenance() {
    console.log("🚀 [BETA-PREP] Initializing Star Ranker Production Economy...");

    try {
        // 1. Reset all Beta Invites
        console.log("🧹 Wiping legacy invitation tokens...");
        await db.delete(betaInvites);

        // 2. Generate Master Beta Code
        console.log("🔑 Seeding master beta code: STAR-BETA-2024");
        await db.insert(betaInvites).values({
            code: "STAR-BETA-2024",
            isReusable: true
        });

        // 3. Purge Activity
        console.log("💣 Purging global voting and staking telemetry...");
        await db.delete(votes);
        await db.delete(stakes);

        // 4. Reset User Accounts
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
