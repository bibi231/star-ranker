import { Router } from "express";
import { db } from "../db/index";
import { items } from "../db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/items?category=crypto — Fetch items by category slug
router.get("/", async (req, res) => {
    try {
        const category = req.query.category as string;
        if (!category) {
            return res.status(400).json({ error: "category query param required" });
        }

        const result = await db
            .select()
            .from(items)
            .where(eq(items.categorySlug, category))
            .orderBy(desc(items.score));

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/items/:docId — Get single item
router.get("/:docId", async (req, res) => {
    try {
        const result = await db
            .select()
            .from(items)
            .where(eq(items.docId, req.params.docId))
            .limit(1);

        if (result.length === 0) {
            return res.status(404).json({ error: "Item not found" });
        }

        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
