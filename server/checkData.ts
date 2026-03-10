import "dotenv/config";
import { db } from "./db/index";
import { items, categories } from "./db/schema";
import { count, eq } from "drizzle-orm";

async function checkData() {
    console.log("🔍 Checking Data...");
    try {
        const [catCount] = await db.select({ count: count() }).from(categories);
        const [itemCount] = await db.select({ count: count() }).from(items);

        console.log(`Categories: ${catCount.count}`);
        console.log(`Items: ${itemCount.count}`);

        const sampleItems = await db.select().from(items).where(eq(items.categorySlug, 'crypto')).limit(5);
        console.log("Sample Crypto Items:", sampleItems.map(i => i.name));

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

checkData();
