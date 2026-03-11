import { db } from "../server/db/index.js";
import { users, betaInvites, votes, stakes } from "../server/db/schema.js";
import { sql } from "drizzle-orm";

async function maintenance() {
    console.log("🚀 Starting Production Beta Maintenance...");

    try {
        // 1. Reset all Beta Invites (Wipe old ones)
        console.log("🧹 Wiping old beta invites...");
        await db.delete(betaInvites);

        // 2. Generate Master Beta Code
        console.log("🔑 Seeding master beta code: STAR-BETA-2024");
        await db.insert(betaInvites).values({
            code: "STAR-BETA-2024",
            isReusable: true
        });

        // 3. Purge Activity (Votes and Stakes)
        console.log("💣 Purging old voting and staking history...");
        await db.delete(votes);
        await db.delete(stakes);

        // 4. Reset User Balances & Reputation
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
