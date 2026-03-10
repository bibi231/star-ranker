/**
 * Direct database seed script — run with: npx tsx server/seedAll.ts
 */
import "dotenv/config";
import { db } from "./db/index";
import { categories, items, epochs, marketMeta } from "./db/schema";
import { CATEGORIES, SEED_ITEMS } from "./data/seedData";

async function seedAll() {
    console.log("🌱 Seeding Star Ranker database...\n");

    let itemCount = 0;

    // Upsert all 10 categories
    for (const cat of CATEGORIES) {
        await db.insert(categories).values(cat)
            .onConflictDoUpdate({ target: categories.slug, set: { title: cat.title, description: cat.description } });
        console.log(`  ✓ Category: ${cat.title}`);
    }

    // Upsert all items (100 per category)
    for (const [slug, itemList] of Object.entries(SEED_ITEMS)) {
        for (let i = 0; i < itemList.length; i++) {
            const item = itemList[i];
            const docId = `item_${slug}_${i}`;
            const baseScore = Math.floor(Math.random() * 8000) + 2000;

            await db.insert(items).values({
                docId,
                name: item.name,
                symbol: item.symbol,
                categorySlug: slug,
                score: baseScore,
                velocity: parseFloat(((Math.random() * 20) - 10).toFixed(1)),
                momentum: parseFloat(((Math.random() * 10) - 5).toFixed(2)),
                volatility: parseFloat((Math.random() * 10 + 1).toFixed(1)),
                rank: i + 1,
                totalVotes: Math.floor(Math.random() * 5000) + 500,
                trend: Array.from({ length: 15 }, () => Math.floor(Math.random() * 100)),
                status: "active",
            }).onConflictDoUpdate({
                target: items.docId,
                set: { name: item.name, symbol: item.symbol, score: baseScore },
            });
            itemCount++;
        }
        console.log(`  ✓ Items: ${slug} (${itemList.length})`);
    }

    // Ensure epoch exists
    const now = new Date();
    const epochDuration = 30 * 60 * 1000;
    await db.insert(epochs).values({
        epochNumber: 1,
        isActive: true,
        startTime: now,
        endTime: new Date(now.getTime() + epochDuration),
        duration: epochDuration,
    }).onConflictDoNothing();
    console.log(`  ✓ Epoch initialized`);

    // Upsert market meta for all categories
    for (const cat of CATEGORIES) {
        await db.insert(marketMeta).values({
            categorySlug: cat.slug,
            totalStaked: 0,
            platformRevenue: 0,
            itemExposure: {},
        }).onConflictDoUpdate({
            target: marketMeta.categorySlug,
            set: { totalStaked: 0 },
        });
    }
    console.log(`  ✓ Market meta initialized`);

    console.log(`\n✅ Seeded ${CATEGORIES.length} categories with ${itemCount} total items.`);
    process.exit(0);
}

seedAll().catch(err => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
