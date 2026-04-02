import { Router } from "express";
import { db } from "../db/index";
import { categories } from "../db/schema";

import { cacheGet, cacheSet } from "../services/cache";

const router = Router();

// GET /api/categories — List all categories
router.get("/", async (_req, res) => {
    const cacheKey = "categories";
    try {
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const result = await db.select().from(categories);
        await cacheSet(cacheKey, result, 300); // 5 minutes
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
