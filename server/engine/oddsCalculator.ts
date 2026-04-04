import { db } from "../db/index";
import { stakes } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface OddsResult {
  impliedProbability: number;  // 0-100 integer
  multiplier: number;          // e.g. 4.3 - rounded to 1 decimal
  riskLevel: 'low' | 'medium' | 'high';
}

const PLATFORM_RAKE_RATE = 0.05; // 5% fee
const MIN_MULTIPLIER = 1.1;
const MAX_MULTIPLIER = 50;

/**
 * Calculates raw odds metrics statically.
 */
function computeOdds(totalOnItem: number, totalInCategory: number): OddsResult {
    if (totalInCategory === 0 || totalOnItem === 0) {
      return { impliedProbability: 50, multiplier: 2.0, riskLevel: 'medium' };
    }

    let impliedProbability = Math.round((totalOnItem / totalInCategory) * 100);
    impliedProbability = Math.round(impliedProbability * (1 - PLATFORM_RAKE_RATE));
    impliedProbability = Math.max(1, Math.min(99, impliedProbability));

    let multiplier = 1 / (impliedProbability / 100);
    multiplier = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, multiplier));
    multiplier = Math.round(multiplier * 10) / 10;

    let riskLevel: 'low' | 'medium' | 'high';
    if (impliedProbability > 60) riskLevel = 'low';
    else if (impliedProbability >= 30) riskLevel = 'medium';
    else riskLevel = 'high';

    return { impliedProbability, multiplier, riskLevel };
}

/**
 * Helper to fall back to neutral odds.
 */
function neutralOdds(): OddsResult {
    return { impliedProbability: 50, multiplier: 2.0, riskLevel: 'medium' };
}

/**
 * Calculate odds for a single item.
 */
export async function calculateOdds(
  itemDocId: string,
  categorySlug: string,
  epochId: number
): Promise<OddsResult> {
  try {
    const allStakes = await db
      .select({ itemDocId: stakes.itemDocId, amount: stakes.amount })
      .from(stakes)
      .where(
        and(
          eq(stakes.categorySlug, categorySlug),
          eq(stakes.epochId, epochId),
          eq(stakes.status, 'active')
        )
      );

    let totalInCategory = 0;
    let totalOnItem = 0;

    for (const stake of allStakes) {
      totalInCategory += (stake.amount || 0);
      if (stake.itemDocId === itemDocId) {
          totalOnItem += (stake.amount || 0);
      }
    }

    return computeOdds(totalOnItem, totalInCategory);
  } catch (error) {
    console.error('[oddsCalculator] Error calculating odds:', error);
    return neutralOdds();
  }
}

/**
 * Bulk calculate odds for multiple item IDs efficiently.
 */
export async function calculateMultipleOdds(
  itemDocIds: string[],
  categorySlug: string,
  epochId: number
): Promise<Record<string, OddsResult>> {
  try {
    const allStakes = await db
      .select({ itemDocId: stakes.itemDocId, amount: stakes.amount })
      .from(stakes)
      .where(
        and(
          eq(stakes.categorySlug, categorySlug),
          eq(stakes.epochId, epochId),
          eq(stakes.status, 'active')
        )
      );

    const stakesByItem: Record<string, number> = {};
    let totalInCategory = 0;

    for (const stake of allStakes) {
      const amount = stake.amount || 0;
      totalInCategory += amount;
      
      if (!stakesByItem[stake.itemDocId]) {
          stakesByItem[stake.itemDocId] = 0;
      }
      stakesByItem[stake.itemDocId] += amount;
    }

    const results: Record<string, OddsResult> = {};
    for (const id of itemDocIds) {
      results[id] = computeOdds(stakesByItem[id] || 0, totalInCategory);
    }
    
    return results;

  } catch (error) {
    console.error('[oddsCalculator] Bulk calculation failed:', error);
    const fallback: Record<string, OddsResult> = {};
    for (const id of itemDocIds) fallback[id] = neutralOdds();
    return fallback;
  }
}
