import { db } from "../db/index";
import { betaInvites } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    try {
        const invite = await db.select().from(betaInvites).where(eq(betaInvites.code, "STAR-BETA-2026"));
        if (invite.length === 0) {
            await db.insert(betaInvites).values({
                code: "STAR-BETA-2026",
                isReusable: true,
                createdBy: 1, // 1 is system
            });
            console.log("Created master invite code");
        } else {
            await db.update(betaInvites).set({ isReusable: true }).where(eq(betaInvites.code, "STAR-BETA-2026"));
            console.log("Made existing invite code infinite");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
