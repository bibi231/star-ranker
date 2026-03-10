import dotenv from "dotenv";
dotenv.config();

import { db } from "../db/index";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

async function createAdmin() {
    console.log("🚀 Starting Star Ranker Admin Provisioning...");

    const email = "peterjohn2343@gmail.com";

    try {
        console.log(`[Database] Provisioning Oracle tier for: ${email}`);

        const result = await db.update(users).set({
            tier: "Oracle",
            balance: 1000000,
            powerVotes: 1000
        }).where(eq(users.email, email)).returning();

        if (result.length === 0) {
            console.log(`❌ ERROR: User ${email} not found in database.`);
            console.log(`Please sign in via the website first using Google Auth, then run this script again.`);
            process.exit(1);
        }

        console.log("✅ Admin Provisioning Complete!");
        console.log("-----------------------------------------");
        console.log(`Email:    ${email}`);
        console.log(`Tier:     Oracle`);
        console.log(`Status:   Your existing account has been elevated to Super-Admin.`);
        console.log("-----------------------------------------");

        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to provision admin:", error);
        process.exit(1);
    }
}

createAdmin();
