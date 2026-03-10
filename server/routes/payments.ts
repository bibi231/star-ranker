/**
 * Paystack Payment Routes
 * 
 * POST /api/payments/initialize  — Start a payment, get Paystack redirect URL
 * GET  /api/payments/verify/:ref — Verify payment on return, credit user balance
 * POST /api/payments/webhook     — Paystack webhook (backup verification)
 */

import { Router } from "express";
import { db } from "../db/index";
import { users } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE = "https://api.paystack.co";

// Track processed references for idempotency
const processedRefs = new Set<string>();

const initSchema = z.object({
    amount: z.number().int().min(100000).max(100000000), // in kobo, min ₦1,000 max ₦1,000,000
    email: z.string().email(),
    callbackUrl: z.string().url().optional(),
});

/**
 * POST /api/payments/initialize — Start a Paystack transaction
 */
router.post("/initialize", requireAuth, async (req: AuthRequest, res) => {
    try {
        const parsed = initSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
        }

        if (!PAYSTACK_SECRET) {
            return res.status(503).json({ error: "Payment service not configured" });
        }

        const { amount, email, callbackUrl } = parsed.data;
        const reference = `sr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

        const paystackRes = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount, // in kobo
                email,
                reference,
                callback_url: callbackUrl || undefined,
                metadata: {
                    userId: req.uid,
                    platform: "star-ranker",
                },
            }),
        });

        const data = await paystackRes.json();

        if (!data.status) {
            return res.status(400).json({ error: data.message || "Paystack initialization failed" });
        }

        res.json({
            authorization_url: data.data.authorization_url,
            reference: data.data.reference,
            access_code: data.data.access_code,
        });
    } catch (error: any) {
        console.error("[Paystack] Init error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payments/verify/:reference — Verify and credit
 */
router.get("/verify/:reference", requireAuth, async (req: AuthRequest, res) => {
    try {
        const { reference } = req.params;

        if (!PAYSTACK_SECRET) {
            return res.status(503).json({ error: "Payment service not configured" });
        }

        // Idempotency check
        if (processedRefs.has(reference)) {
            return res.json({ credited: true, message: "Already processed" });
        }

        const paystackRes = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
        });

        const data = await paystackRes.json();

        if (!data.status || data.data.status !== "success") {
            return res.status(400).json({ error: "Payment not verified", paystackStatus: data.data?.status });
        }

        // Credit user balance (amount comes back in kobo, convert to NGN)
        const amountKobo = data.data.amount;
        const amountNGN = amountKobo / 100;

        // Convert NGN to platform USD equivalent (simplified)
        const platformCredits = Math.floor(amountNGN / 1500 * 100) / 100; // ~₦1500/USD

        await db.update(users)
            .set({ balance: sql`${users.balance} + ${platformCredits}` })
            .where(eq(users.firebaseUid, req.uid!));

        processedRefs.add(reference);

        // Fetch updated balance
        const userResult = await db.select({ balance: users.balance })
            .from(users).where(eq(users.firebaseUid, req.uid!)).limit(1);

        res.json({
            credited: true,
            amountNGN,
            platformCredits,
            newBalance: userResult[0]?.balance ?? 0,
            reference,
        });
    } catch (error: any) {
        console.error("[Paystack] Verify error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payments/webhook — Paystack webhook handler
 * Verify HMAC-SHA512 signature, handle charge.success as backup
 */
router.post("/webhook", async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_WEBHOOK_SECRET || PAYSTACK_SECRET;
        if (!secret) return res.sendStatus(200); // Can't verify without secret

        const hash = crypto
            .createHmac("sha512", secret)
            .update(JSON.stringify(req.body))
            .digest("hex");

        if (hash !== (req.headers["x-paystack-signature"] as string)) {
            return res.status(401).json({ error: "Invalid signature" });
        }

        const event = req.body;

        if (event.event === "charge.success") {
            const { reference, amount, metadata } = event.data;

            // Idempotency
            if (processedRefs.has(reference)) {
                return res.sendStatus(200);
            }

            if (metadata?.userId) {
                const amountNGN = amount / 100;
                const platformCredits = Math.floor(amountNGN / 1500 * 100) / 100;

                await db.update(users)
                    .set({ balance: sql`${users.balance} + ${platformCredits}` })
                    .where(eq(users.firebaseUid, metadata.userId));

                processedRefs.add(reference);
                console.log(`[Paystack] Webhook credited ${platformCredits} to ${metadata.userId}`);
            }
        }

        res.sendStatus(200);
    } catch (error: any) {
        console.error("[Paystack] Webhook error:", error);
        res.sendStatus(200); // Always return 200 to Paystack
    }
});

export default router;
