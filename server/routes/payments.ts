/**
 * Paystack Payment Routes
 * 
 * POST /api/payments/initialize  — Start a payment, get Paystack redirect URL
 * GET  /api/payments/verify/:ref — Verify payment on return, credit user balance
 * POST /api/payments/webhook     — Paystack webhook (backup verification)
 */

import { Router } from "express";
import { db } from "../db/index";
import { users, transactions, marketActivity, withdrawals, notifications } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";
import crypto from "crypto";
import { getRates } from "../services/currencyRate";

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE = "https://api.paystack.co";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || "";
const FLW_BASE = "https://api.flutterwave.com/v3";

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
        const liveRates = getRates();
        const liveNgnUsdRate = liveRates.NGN_USD > 0 ? (1 / liveRates.NGN_USD) : 1500;

        await db.insert(transactions).values({
            userId: req.uid!,
            type: "deposit",
            amountNgn: amount / 100,
            amountUsd: (amount / 100) / liveNgnUsdRate,
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

        const liveRates = getRates();
        const liveNgnUsdRate = liveRates.NGN_USD > 0 ? (1 / liveRates.NGN_USD) : 1500;

        const platformCredits = Math.floor(amountNGN / liveNgnUsdRate * 100) / 100;

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

        const paystackSignature = req.headers["x-paystack-signature"] as string;
        const hash = crypto
            .createHmac("sha512", secret)
            .update((req as any).rawBody || JSON.stringify(req.body))
            .digest("hex");

        if (hash !== paystackSignature) {
            console.error("[Paystack Webhook] Invalid signature mismatch");
            // Audit log for debugging (not exposing the signature/body)
            await db.insert(marketActivity).values({
                type: "deposit",
                description: `Webhook signature mismatch detected. Check PAYSTACK_WEBHOOK_SECRET.`,
                metadata: { receivedHash: hash.substring(0, 10) + "...", source: "webhook_failure" }
            });
            return res.status(401).json({ error: "Invalid signature" });
        }

        const event = req.body;

        if (event.event === "charge.success") {
            const { reference, amount, metadata, id: paystackId } = event.data;
            const refStr = reference as string;

            if (metadata?.userId) {
                const amountNGN = amount / 100;
                const liveRates = getRates();
                const liveNgnUsdRate = liveRates.NGN_USD > 0 ? (1 / liveRates.NGN_USD) : 1500;
                const platformCredits = Math.floor(amountNGN / liveNgnUsdRate * 100) / 100;

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

        // ===== TRANSFER WEBHOOKS (Withdrawals) =====
        if (event.event === 'transfer.success') {
            const transferCode = event.data?.transfer_code;
            if (transferCode) {
                await db.update(withdrawals)
                    .set({ status: 'success', updatedAt: new Date() })
                    .where(eq(withdrawals.paystackRef, transferCode));
                console.log(`[Paystack Webhook] Transfer ${transferCode} succeeded`);
            }
        }

        if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
            const transferCode = event.data?.transfer_code;
            if (transferCode) {
                // Find the withdrawal and refund the user
                const wdRows = await db.select()
                    .from(withdrawals)
                    .where(eq(withdrawals.paystackRef, transferCode))
                    .limit(1);

                if (wdRows.length > 0) {
                    const wd = wdRows[0];
                    await db.transaction(async (tx) => {
                        await tx.update(users)
                            .set({ balance: sql`${users.balance} + ${wd.amount}` })
                            .where(eq(users.firebaseUid, wd.userId));
                        await tx.update(withdrawals)
                            .set({ status: 'failed', updatedAt: new Date() })
                            .where(eq(withdrawals.id, wd.id));
                        await tx.insert(notifications).values({
                            userId: wd.userId,
                            title: "Withdrawal Failed",
                            message: `Your ₦${wd.amount.toLocaleString()} withdrawal could not be processed. The amount has been refunded to your wallet.`,
                            type: "system"
                        });
                    });
                    console.log(`[Paystack Webhook] Transfer ${transferCode} FAILED — refunded ₦${wd.amount} to ${wd.userId}`);
                }
            }
        }

        res.sendStatus(200);
    } catch (error: any) {
        console.error("[Paystack Webhook] Error:", error);
        res.sendStatus(200);
    }
});

// ─── Flutterwave (NGN hosted checkout) ─────────────────────────────────────

const flwInitSchema = z.object({
    amount: z.number().int().min(100000).max(100000000), // kobo, same as Paystack
    email: z.string().email(),
    callbackUrl: z.string().url().optional(),
});

/**
 * POST /api/payments/flutterwave/initialize — Start Flutterwave standard payment (redirect to checkout)
 */
router.post("/flutterwave/initialize", requireAuth, async (req: AuthRequest, res) => {
    try {
        const parsed = flwInitSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
        }

        if (!FLW_SECRET) {
            return res.status(503).json({ error: "Flutterwave is not configured (FLUTTERWAVE_SECRET_KEY)" });
        }

        const { amount, email, callbackUrl } = parsed.data;
        const amountNgn = amount / 100;
        const txRef = `sr_flw_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

        const flwRes = await fetch(`${FLW_BASE}/payments`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${FLW_SECRET}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tx_ref: txRef,
                amount: String(amountNgn),
                currency: "NGN",
                redirect_url: callbackUrl || undefined,
                customer: {
                    email,
                    name: (req as any).userName || email.split("@")[0] || "Star Ranker user",
                },
                customizations: {
                    title: "Star Ranker",
                    description: "Wallet funding",
                },
                meta: {
                    userId: req.uid,
                    platform: "star-ranker",
                },
            }),
        });

        const data = await flwRes.json();

        const ok = data.status === "success" || data.status === true;
        if (!flwRes.ok || !ok) {
            console.error("[Flutterwave] Init failed:", data);
            return res.status(400).json({
                error: data.message || "Flutterwave initialization failed",
                details: data.data,
            });
        }

        const link = data.data?.link;
        if (!link) {
            return res.status(400).json({ error: "No checkout link from Flutterwave" });
        }

        const liveRates = getRates();
        const liveNgnUsdRate = liveRates.NGN_USD > 0 ? 1 / liveRates.NGN_USD : 1500;

        await db.insert(transactions).values({
            userId: req.uid!,
            type: "deposit",
            amountNgn,
            amountUsd: amountNgn / liveNgnUsdRate,
            reference: txRef,
            status: "pending",
            metadata: { provider: "flutterwave", initResponse: data.data },
        });

        res.json({
            authorization_url: link,
            reference: txRef,
            provider: "flutterwave",
        });
    } catch (error: any) {
        console.error("[Flutterwave] Init error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payments/flutterwave/verify/:txRef — Verify Flutterwave transaction and credit balance
 */
router.get("/flutterwave/verify/:txRef", requireAuth, async (req: AuthRequest, res) => {
    try {
        const txRef = req.params.txRef as string;

        if (!FLW_SECRET) {
            return res.status(503).json({ error: "Flutterwave is not configured" });
        }

        const existing = await db.select().from(transactions).where(eq(transactions.reference, txRef)).limit(1);
        if (existing.length > 0 && existing[0].status === "completed") {
            const userResult = await db.select({ balance: users.balance })
                .from(users).where(eq(users.firebaseUid, req.uid!)).limit(1);
            return res.json({
                credited: true,
                message: "Already processed",
                newBalance: userResult[0]?.balance ?? 0,
            });
        }

        const verifyUrl = `${FLW_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
        const flwRes = await fetch(verifyUrl, {
            headers: { Authorization: `Bearer ${FLW_SECRET}` },
        });

        const data = await flwRes.json();

        if (!data.status || data.status !== "success") {
            return res.status(400).json({ error: data.message || "Verification request failed" });
        }

        const d = data.data;
        if (!d || d.status !== "successful") {
            return res.status(400).json({ error: "Payment not successful", flwStatus: d?.status });
        }

        const amountNGN = typeof d.amount === "number" ? d.amount : parseFloat(String(d.amount));

        const liveRates = getRates();
        const liveNgnUsdRate = liveRates.NGN_USD > 0 ? 1 / liveRates.NGN_USD : 1500;
        const platformCredits = Math.floor((amountNGN / liveNgnUsdRate) * 100) / 100;

        const flwId = d.id != null ? String(d.id) : d.flw_ref || txRef;

        await db.transaction(async (tx) => {
            const check = await tx.select().from(transactions).where(eq(transactions.reference, txRef)).limit(1).for("update");
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
                        paystackRef: `flw:${flwId}`,
                        settledAt: new Date(),
                    })
                    .where(eq(transactions.id, check[0].id));
            } else {
                await tx.insert(transactions).values({
                    userId: req.uid as string,
                    type: "deposit",
                    amountNgn: amountNGN,
                    amountUsd: platformCredits,
                    netAmountUsd: platformCredits,
                    reference: txRef,
                    status: "completed",
                    paystackRef: `flw:${flwId}`,
                    metadata: { provider: "flutterwave" },
                    settledAt: new Date(),
                });
            }

            await tx.insert(marketActivity).values({
                type: "deposit",
                userId: req.uid!,
                amount: platformCredits,
                description: `Deposit of ${platformCredits.toFixed(2)} units confirmed (Flutterwave, Ref: ${txRef})`,
                metadata: { reference: txRef, flutterwaveId: flwId },
            });
        });

        const userResult = await db.select({ balance: users.balance })
            .from(users).where(eq(users.firebaseUid, req.uid!)).limit(1);

        res.json({
            credited: true,
            amountNGN,
            platformCredits,
            newBalance: userResult[0]?.balance ?? 0,
            reference: txRef,
        });
    } catch (error: any) {
        console.error("[Flutterwave] Verify error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payments/flutterwave/webhook — Flutterwave (optional; set secret hash in dashboard)
 */
router.post("/flutterwave/webhook", async (req, res) => {
    try {
        const expected = process.env.FLUTTERWAVE_SECRET_HASH || "";
        const verifHash = req.headers["verif-hash"] as string | undefined;
        if (expected && verifHash !== expected) {
            console.error("[Flutterwave Webhook] Invalid verif-hash");
            return res.status(401).json({ error: "Invalid signature" });
        }

        const evt = req.body;
        const eventType = evt?.event;
        const data = evt?.data;

        if (eventType === "charge.completed" && data?.status === "successful" && data?.tx_ref) {
            const txRef = data.tx_ref as string;

            const pendingRows = await db.select().from(transactions).where(eq(transactions.reference, txRef)).limit(1);
            const userId = pendingRows[0]?.userId;
            if (!userId) {
                console.warn("[Flutterwave Webhook] No pending transaction for", txRef);
                return res.sendStatus(200);
            }

            const amountNGN = typeof data.amount === "number" ? data.amount : parseFloat(String(data.amount || 0));
            const liveRates = getRates();
            const liveNgnUsdRate = liveRates.NGN_USD > 0 ? 1 / liveRates.NGN_USD : 1500;
            const platformCredits = Math.floor((amountNGN / liveNgnUsdRate) * 100) / 100;

            await db.transaction(async (tx) => {
                const existing = await tx.select()
                    .from(transactions)
                    .where(eq(transactions.reference, txRef))
                    .limit(1)
                    .for("update");

                if (existing.length > 0 && existing[0].status === "completed") return;

                await tx.update(users)
                    .set({ balance: sql`${users.balance} + ${platformCredits}` })
                    .where(eq(users.firebaseUid, userId));

                const flwId = data.id != null ? String(data.id) : txRef;

                if (existing.length > 0) {
                    await tx.update(transactions)
                        .set({
                            status: "completed",
                            amountNgn: amountNGN,
                            amountUsd: platformCredits,
                            netAmountUsd: platformCredits,
                            paystackRef: `flw:${flwId}`,
                            settledAt: new Date(),
                        })
                        .where(eq(transactions.id, existing[0].id));
                } else {
                    await tx.insert(transactions).values({
                        userId,
                        type: "deposit",
                        amountNgn: amountNGN,
                        amountUsd: platformCredits,
                        netAmountUsd: platformCredits,
                        reference: txRef,
                        status: "completed",
                        paystackRef: `flw:${flwId}`,
                        settledAt: new Date(),
                        metadata: { provider: "flutterwave", source: "webhook" },
                    });
                }

                await tx.insert(marketActivity).values({
                    type: "deposit",
                    userId,
                    amount: platformCredits,
                    description: `Deposit via Flutterwave webhook (Ref: ${txRef})`,
                    metadata: { reference: txRef, source: "flutterwave_webhook" },
                });
            });
        }

        res.sendStatus(200);
    } catch (error: any) {
        console.error("[Flutterwave Webhook] Error:", error);
        res.sendStatus(200);
    }
});

export default router;
