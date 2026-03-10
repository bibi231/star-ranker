import { Request, Response, NextFunction } from "express";

/**
 * Middleware to detect user country and attach it to the request.
 * For production, use a Geo-IP database or provider headers (Cloudflare, Vercel, etc.)
 */
export const geoMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // 1. Check for manual override (for testing)
    const override = req.query.geo_country as string;
    if (override) {
        (req as any).country = override.toUpperCase();
        return next();
    }

    // 2. Check for Cloudflare / Vercel headers
    const cfCountry = req.headers["cf-ipcountry"] as string;
    const vercelCountry = req.headers["x-vercel-ip-country"] as string;

    // 3. Detect from IP (using public service in production - here we fallback)
    (req as any).country = cfCountry || vercelCountry || "US";

    // 4. Determine Jurisdiction Restrictions
    const restrictedCountries = ["CU", "IR", "KP", "SY", "RU"]; // Example sanction list
    const gamblingRestricted = ["AE", "SA", "QA"]; // Example gambling restrictions

    (req as any).jurisdiction = {
        isRestricted: restrictedCountries.includes((req as any).country),
        isGamblingRestricted: gamblingRestricted.includes((req as any).country),
        canStake: !restrictedCountries.includes((req as any).country) && !gamblingRestricted.includes((req as any).country)
    };

    next();
};

export const requireStakeAccess = (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).jurisdiction?.canStake) {
        return res.status(403).json({
            error: "Jurisdictional Restriction",
            message: "Staking is not available in your region due to local regulations.",
            country: (req as any).country
        });
    }
    next();
};
