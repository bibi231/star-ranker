/**
 * Withdrawals Route — Full Paystack Transfer Implementation
 */

import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { db } from "../db/index";
import { users, withdrawals, transactions, notifications } from "../db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

// GET /api/withdrawals/banks — Nigerian banks from Paystack
router.get("/banks", async (_req, res: Response) => {
    try {
        const response = await fetch("https://api.paystack.co/bank?currency=NGN&country=nigeria", {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        });
        const data = await response.json();
        if (!data.status) return res.status(500).json({ error: "Failed to fetch banks" });
        return res.json(data.data);
    } catch (err) {
        console.error("[Withdrawals] Bank list fetch failed:", err);
        return res.status(500).json({ error: "Failed to fetch banks" });
    }
});

// POST /api/withdrawals/resolve — Resolve account name
router.post("/resolve", requireAuth, async (req: AuthRequest, res: Response) => {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !bankCode) {
        return res.status(400).json({ error: "accountNumber and bankCode required" });
    }
    try {
        const response = await fetch(
            `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
            { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
        );
        const data = await response.json();
        if (!data.status) return res.status(400).json({ error: "Account not found" });
        return res.json({ accountName: data.data.account_name });
    } catch (err) {
        console.error("[Withdrawals] Account resolution failed:", err);
        return res.status(500).json({ error: "Account resolution failed" });
    }
});

// POST /api/withdrawals/request — Initiate withdrawal
router.post("/request", requireAuth, async (req: AuthRequest, res: Response) => {
    const { amount, bankCode, accountNumber, accountName } = req.body;
    const userId = req.uid!;

    // Validate
    if (!amount || amount < 100) {
        return res.status(400).json({ error: "Minimum withdrawal is ₦100" });
    }
    if (!bankCode || !accountNumber || accountNumber.length !== 10 || !accountName) {
        return res.status(400).json({ error: "Invalid bank details" });
    }

    try {
        // Check balance
        const userRows = await db.select({ id: users.id, balance: users.balance })
            .from(users)
            .where(eq(users.firebaseUid, userId))
            .limit(1);

        if (!userRows.length) return res.status(404).json({ error: "User not found" });
        const user = userRows[0];
        const userBalance = user.balance ?? 0;

        if (userBalance < amount) {
            return res.status(400).json({ error: `Insufficient balance. You have ₦${userBalance.toLocaleString()}` });
        }

        // Create Paystack transfer recipient
        const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "nuban",
                name: accountName,
                account_number: accountNumber,
                bank_code: bankCode,
                currency: "NGN"
            })
        });
        const recipientData = await recipientRes.json();
        if (!recipientData.status) {
            return res.status(400).json({ error: "Could not create transfer recipient" });
        }

        const recipientCode = recipientData.data.recipient_code;

        // Initiate transfer
        const transferRes = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                source: "balance",
                amount: amount * 100, // kobo
                recipient: recipientCode,
                reason: `Star Ranker withdrawal for ${userId.slice(-6)}`
            })
        });
        const transferData = await transferRes.json();
        if (!transferData.status) {
            return res.status(400).json({ error: transferData.message || "Transfer failed" });
        }

        // Deduct balance and record withdrawal atomically
        const txRef = `wd_${Date.now()}_${userId.slice(-4)}`;
        await db.transaction(async (tx) => {
            await tx.update(users)
                .set({ balance: sql`${users.balance} - ${amount}` })
                .where(eq(users.firebaseUid, userId));

            await tx.insert(withdrawals).values({
                userId,
                amount,
                bankCode,
                accountNumber,
                accountName,
                paystackRef: transferData.data.transfer_code,
                status: "pending"
            });

            await tx.insert(transactions).values({
                userId,
                type: "withdrawal",
                amountUsd: -amount,
                netAmountUsd: -amount,
                status: "pending",
                reference: txRef,
                metadata: { bankCode, accountNumber, accountName, transferCode: transferData.data.transfer_code }
            });

            await tx.insert(notifications).values({
                userId,
                title: "Withdrawal Initiated",
                message: `₦${amount.toLocaleString()} withdrawal to ${accountName} is being processed. Funds arrive within 24 hours.`,
                type: "system"
            });
        });

        return res.json({
            success: true,
            message: "Withdrawal initiated. Funds arrive within 24 hours.",
            reference: transferData.data.transfer_code,
            newBalance: userBalance - amount
        });

    } catch (err) {
        console.error("[Withdrawals] Processing failed:", err);
        return res.status(500).json({ error: "Withdrawal processing failed. Please try again." });
    }
});

// GET /api/withdrawals/status — Skeleton for future use
router.get("/history", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await db.select()
            .from(withdrawals)
            .where(eq(withdrawals.userId, req.uid!));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch withdrawal history" });
    }
});

export default router;
