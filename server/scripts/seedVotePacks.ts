import "dotenv/config";
import { db } from "../db/index";
import { votePacks } from "../db/schema";

async function seedVotePacks() {
    console.log("🗳️  Seeding Vote Packs...\n");

    const packs = [
        { name: "Initiate Pack", votes: 10, priceNgn: 1500, active: true },
        { name: "Peer Pack", votes: 50, priceNgn: 7000, active: true },
        { name: "Sage Pack", votes: 200, priceNgn: 25000, active: true },
        { name: "Oracle Pack", votes: 1000, priceNgn: 100000, active: true },
    ];

    for (const pack of packs) {
        await db.insert(votePacks).values(pack).onConflictDoNothing();
        console.log(`  ✓ Created Pack: ${pack.name} (${pack.votes} votes)`);
    }

    console.log("\n✅ Vote packs initialized.");
    process.exit(0);
}

seedVotePacks().catch(console.error);
