/**
 * Production-Grade Geo-Gating Middleware
 * 
 * Total Block:   CU, IR, KP, SY, RU  — blocked from ALL platform access
 * Staking Block: AE, SA, QA, BH, KW, OM — can view/vote but NOT stake or make payments
 * 
 * Detection priority: Vercel edge headers > Cloudflare headers > Fallback
 */

import { Request, Response, NextFunction } from "express";

const TOTAL_BLOCK = new Set(['CU', 'IR', 'KP', 'SY', 'RU']);
const STAKING_BLOCK = new Set(['AE', 'SA', 'QA', 'BH', 'KW', 'OM']);

/**
 * Extract country code from the most reliable header available.
 * Priority: Vercel edge (hardest to spoof) > Cloudflare > custom > fallback.
 */
export function getCountryCode(req: Request): string {
    return (
        (req.headers['x-vercel-ip-country'] as string) ||     // Vercel edge (injected by Vercel CDN)
        (req.headers['cf-ipcountry'] as string) ||             // Cloudflare
        (req.headers['x-country-code'] as string) ||           // Custom proxy header
        'NG'                                                    // Default to Nigeria if unknown
    ).toUpperCase().trim();
}

/**
 * Global geo-blocking middleware.
 * Blocks access entirely for sanctioned countries (CU, IR, KP, SY, RU).
 * Attaches country code and staking restriction flags to the request.
 */
export function geoBlock(req: Request, res: Response, next: NextFunction) {
    const country = getCountryCode(req);

    if (TOTAL_BLOCK.has(country)) {
        return res.status(403).json({
            error: 'Service not available in your region',
            code: 'GEO_BLOCKED',
        });
    }

    // Attach to request for downstream middleware
    (req as any).countryCode = country;
    (req as any).stakingBlocked = STAKING_BLOCK.has(country);
    (req as any).jurisdiction = {
        isRestricted: false,  // Not fully blocked (those are caught above)
        isGamblingRestricted: STAKING_BLOCK.has(country),
        canStake: !STAKING_BLOCK.has(country),
    };

    next();
}

/**
 * Staking-specific geo restriction.
 * Apply this middleware to POST /api/stakes and POST /api/payments/initialize.
 * Users in AE, SA, QA, BH, KW, OM can still view, vote, and browse — just not stake.
 */
export function requireStakingAllowed(req: Request, res: Response, next: NextFunction) {
    if ((req as any).stakingBlocked) {
        return res.status(403).json({
            error: 'Financial staking is not available in your region. You can still vote and view rankings.',
            code: 'STAKING_GEO_BLOCKED',
        });
    }
    next();
}

// Legacy alias for backward compatibility
export const geoMiddleware = geoBlock;
export const requireStakeAccess = requireStakingAllowed;
