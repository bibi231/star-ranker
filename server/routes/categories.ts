import { Router } from "express";
import { db } from "../db/index";
import { categories } from "../db/schema";

const router = Router();

// GET /api/categories — List all categories
router.get("/", async (_req, res) => {
    try {
        const result = await db.select().from(categories);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
