import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql, eq } from "drizzle-orm";
import { users, transactions, marketActivity } from "../db/schema";

async function rescue() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL is not set.");
        return;
    }

    const pool = new Pool({ connectionString });
    const db = drizzle(pool);

    const reference = "sr_1773519815674_672391f5";
    const userId = "sZpcv1u7QOhd4CSSzxZBd7mHCuf1"; // Extracted from logs for peterjohn2343@gmail.com
    const amountNgn = 1000;
    const NGN_USD_RATE = 1500;
    const platformCredits = Math.floor(amountNgn / NGN_USD_RATE * 100) / 100;

    console.log(`🚀 Rescuing transaction ${reference} for user ${userId}...`);

    try {
        await db.transaction(async (tx) => {
            // 1. Check if already exists
            const existing = await tx.select().from(transactions).where(eq(transactions.reference, reference)).limit(1);
            if (existing.length > 0 && existing[0].status === "completed") {
                console.log("⚠️ Transaction already marked as completed.");
                return;
            }

            // 2. Credit user
            console.log(`Crediting ${platformCredits} units...`);
            await tx.update(users)
                .set({ balance: sql`${users.balance} + ${platformCredits}`, powerVotes: sql`${users.powerVotes} + 5` })
                .where(eq(users.firebaseUid, userId));

            // 3. Upsert transaction
            if (existing.length > 0) {
                await tx.update(transactions)
                    .set({ status: "completed", amountNgn, amountUsd: platformCredits, netAmountUsd: platformCredits, settledAt: new Date() })
                    .where(eq(transactions.id, existing[0].id));
            } else {
                await tx.insert(transactions).values({
                    userId, type: "deposit", amountNgn, amountUsd: platformCredits, netAmountUsd: platformCredits,
                    reference, status: "completed", settledAt: new Date()
                });
            }

            // 4. Log activity
            await tx.insert(marketActivity).values({
                type: "deposit", userId, amount: platformCredits,
                description: `Manual Rescue Credit: ${amountNgn} NGN (Ref: ${reference})`,
            });
        });
        console.log("✅ Rescue operation successful!");
    } catch (error) {
        console.error("❌ Rescue failed:", error);
    } finally {
        await pool.end();
    }
}

rescue();
