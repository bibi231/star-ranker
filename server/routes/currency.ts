import { Router, Request, Response } from "express";
import { getRates } from "../services/currencyRate";

const router = Router();

// GET /api/currency/rates
router.get("/rates", (_req: Request, res: Response) => {
    res.json(getRates());
});

export default router;
