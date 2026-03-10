/**
 * Seed Beta Invite Codes
 * Run: npx tsx server/scripts/seedInvites.ts
 */

import "dotenv/config";
import { db } from "../db/index";
import { betaInvites } from "../db/schema";

async function seedInvites() {
    const codes = Array.from({ length: 50 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    console.log("🎟️  Generating 50 beta invite codes...\n");

    for (const code of codes) {
        try {
            await db.insert(betaInvites).values({ code }).onConflictDoNothing();
        } catch (e) {
            // skip duplicates
        }
    }

    console.log("✅ Beta invite codes created:\n");
    codes.forEach((c, i) => console.log(`  ${(i + 1).toString().padStart(2, '0')}. ${c}`));
    console.log("\n📋 Copy these codes and send to your beta testers.");
    process.exit(0);
}

seedInvites().catch(console.error);
