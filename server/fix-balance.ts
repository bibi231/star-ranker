import { config } from "dotenv";
config({ path: ".env.vercel.prod" });

import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { eq } from "drizzle-orm";

async function fix() {
    console.log("Setting admin balance to exactly 100,000...");
    const updated = await db.update(users)
        .set({ balance: 100000 })
        .where(eq(users.email, "peterjohn2343@gmail.com"))
        .returning();

    console.log("Updated Admin:", updated[0].email, "Balance:", updated[0].balance);
    process.exit(0);
}

fix().catch(console.error);
