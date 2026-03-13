import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function verifyUser() {
    const email = "peterjohn2343@gmail.com";
    console.log(`Checking user: ${email}...`);

    try {
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (user.length > 0) {
            console.log("User data:", JSON.stringify(user[0], null, 2));
        } else {
            console.log("User NOT FOUND.");
        }
    } catch (error) {
        console.error("Error checking user:", error);
    } finally {
        process.exit(0);
    }
}

verifyUser();
