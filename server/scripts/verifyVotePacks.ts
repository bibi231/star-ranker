import "dotenv/config";
import { db } from "./db/index";
import { votePacks } from "./db/schema";

async function checkPacks() {
    const packs = await db.select().from(votePacks);
    console.log(`Found ${packs.length} vote packs:`);
    packs.forEach(p => console.log(` - ${p.name}: ${p.votes} votes, ${p.priceNgn} NGN`));
    process.exit(0);
}

checkPacks().catch(console.error);
