import { db } from "./db/index";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

async function check() {
    const rows = await db.select().from(users).where(eq(users.email, "peterjohn2343@gmail.com"));
    console.log("Admin Data:", rows[0]);
    process.exit(0);
}

check().catch(console.error);
