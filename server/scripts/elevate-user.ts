import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function elevateUser() {
    const email = "peterjohn2343@gmail.com";
    console.log(`Elevating user: ${email} to Oracle tier...`);

    try {
        const result = await db.update(users)
            .set({
                tier: "Oracle",
                reputation: 1000,
                balance: 1000000 // Give some balance for testing too
            })
            .where(eq(users.email, email))
            .returning();

        if (result.length > 0) {
            console.log("Success! User elevated:", result[0]);
        } else {
            console.log("User not found in database. They may need to sign in first.");
        }
    } catch (error) {
        console.error("Error elevating user:", error);
    } finally {
        process.exit(0);
    }
}

elevateUser();
