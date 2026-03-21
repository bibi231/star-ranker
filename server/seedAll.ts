/**
 * Direct database seed script — run with: npx tsx server/seedAll.ts
 */
import "dotenv/config";
import { runFullSeed } from "./lib/runFullSeed";

async function main() {
    console.log("🌱 Seeding Star Ranker database...\n");
    try {
        const { categories, items } = await runFullSeed();
        console.log(`\n✅ Seeded ${categories} categories with ${items} total items.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Seed failed:", err);
        process.exit(1);
    }
}

main();
