/**
 * Paystack Payment Routes
 * 
 * POST /api/payments/initialize  — Start a payment, get Paystack redirect URL
 * GET  /api/payments/verify/:ref — Verify payment on return, credit user balance
 * POST /api/payments/webhook     — Paystack webhook (backup verification)
 */

import { Router } from "express";
import { db } from "../db/index";
import { users, transactions, marketActivity } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE = "https://api.paystack.co";

const NGN_USD_RATE = 1500; // As per master prompt v3.0

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

        // Record pending transaction
        await db.insert(transactions).values({
            userId: req.uid!,
            type: "deposit",
            amountNgn: amount / 100,
            amountUsd: (amount / 100) / NGN_USD_RATE,
            reference,
            status: "pending",
            metadata: { initResponse: data.data }
        });

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
        const reference = req.params.reference as string;

        if (!PAYSTACK_SECRET) {
            return res.status(503).json({ error: "Payment service not configured" });
        }

        // Check if already completed in ledger
        const existing = await db.select().from(transactions).where(eq(transactions.reference, reference)).limit(1);
        if (existing.length > 0 && existing[0].status === "completed") {
            return res.json({ credited: true, message: "Already processed" });
        }

        const paystackRes = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
        });

        const data = await paystackRes.json();

        if (!data.status || data.data.status !== "success") {
            return res.status(400).json({ error: "Payment not verified", paystackStatus: data.data?.status });
        }

        const amountKobo = data.data.amount;
        const amountNGN = amountKobo / 100;
        const platformCredits = Math.floor(amountNGN / NGN_USD_RATE * 100) / 100;

        // Atomic Transaction: Credit User + Update Ledger
        await db.transaction(async (tx) => {
            // Re-verify status within transaction to prevent race conditions
            const check = await tx.select().from(transactions).where(eq(transactions.reference, reference)).limit(1).for("update");
            if (check.length > 0 && check[0].status === "completed") return;

            await tx.update(users)
                .set({ balance: sql`${users.balance} + ${platformCredits}` })
                .where(eq(users.firebaseUid, req.uid!));

            if (check.length > 0) {
                await tx.update(transactions)
                    .set({
                        status: "completed",
                        amountNgn: amountNGN,
                        amountUsd: platformCredits,
                        netAmountUsd: platformCredits,
                        paystackRef: data.data.id?.toString(),
                        settledAt: new Date()
                    })
                    .where(eq(transactions.id, check[0].id));
            } else {
                await tx.insert(transactions).values({
                    userId: req.uid as string,
                    type: "deposit",
                    amountNgn: amountNGN,
                    amountUsd: platformCredits,
                    netAmountUsd: platformCredits,
                    reference: reference,
                    status: "completed",
                    paystackRef: data.data.id?.toString(),
                    settledAt: new Date()
                });
            }

            // Log to market activity
            await tx.insert(marketActivity).values({
                type: "deposit",
                userId: req.uid!,
                amount: platformCredits,
                description: `Deposit of ${platformCredits.toFixed(2)} units confirmed (Ref: ${reference})`,
                metadata: { reference, paystackId: data.data.id }
            });
        });

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
        if (!secret) return res.sendStatus(200);

        const hash = crypto
            .createHmac("sha512", secret)
            .update(JSON.stringify(req.body))
            .digest("hex");

        if (hash !== (req.headers["x-paystack-signature"] as string)) {
            return res.status(401).json({ error: "Invalid signature" });
        }

        const event = req.body;

        if (event.event === "charge.success") {
            const { reference, amount, metadata, id: paystackId } = event.data;
            const refStr = reference as string;

            if (metadata?.userId) {
                const amountNGN = amount / 100;
                const platformCredits = Math.floor(amountNGN / NGN_USD_RATE * 100) / 100;

                await db.transaction(async (tx) => {
                    const existing = await tx.select()
                        .from(transactions)
                        .where(eq(transactions.reference, refStr))
                        .limit(1)
                        .for("update");

                    if (existing.length > 0 && existing[0].status === "completed") {
                        return; // Idempotency
                    }

                    await tx.update(users)
                        .set({ balance: sql`${users.balance} + ${platformCredits}` })
                        .where(eq(users.firebaseUid, metadata.userId));

                    if (existing.length > 0) {
                        await tx.update(transactions)
                            .set({
                                status: "completed",
                                amountNgn: amountNGN,
                                amountUsd: platformCredits,
                                netAmountUsd: platformCredits,
                                paystackRef: paystackId?.toString(),
                                settledAt: new Date()
                            })
                            .where(eq(transactions.id, existing[0].id));
                    } else {
                        await tx.insert(transactions).values({
                            userId: metadata.userId,
                            type: "deposit",
                            amountNgn: amountNGN,
                            amountUsd: platformCredits,
                            netAmountUsd: platformCredits,
                            reference: refStr,
                            status: "completed",
                            paystackRef: paystackId?.toString(),
                            settledAt: new Date()
                        });
                    }

                    // Log to market activity
                    await tx.insert(marketActivity).values({
                        type: "deposit",
                        userId: metadata.userId,
                        amount: platformCredits,
                        description: `Deposit of ${platformCredits.toFixed(2)} units confirmed via Webhook (Ref: ${refStr})`,
                        metadata: { reference: refStr, paystackId, source: "webhook" }
                    });
                });
                console.log(`[Paystack Webhook] Credited ${platformCredits} to ${metadata.userId} (Ref: ${refStr})`);
            }
        }

        res.sendStatus(200);
    } catch (error: any) {
        console.error("[Paystack Webhook] Error:", error);
        res.sendStatus(200);
    }
});

export default router;
