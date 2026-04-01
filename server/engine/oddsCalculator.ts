/**
 * Odds Calculator — Calculate implied probability and payout multiplier
 * Based on stake distribution within an epoch and category
 */

import { db } from "../db/index";
import { stakes } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface OddsResult {
  impliedProbability: number;  // 0-100 integer
  multiplier: number;          // e.g. 4.3 — rounded to 1 decimal
  riskLevel: 'low' | 'medium' | 'high';
}

const PLATFORM_RAKE_RATE = 0.05; // 5% fee
const MIN_MULTIPLIER = 1.1;
const MAX_MULTIPLIER = 50;

/**
 * Calculate odds for a specific item in a category during an epoch
 */
export async function calculateOdds(
  itemId: number,
  categorySlug: string,
  epochId: number
): Promise<OddsResult> {
  try {
    // Get total staked on this item in this epoch
    const itemStakes = await db
      .select()
      .from(stakes)
      .where(
        and(
          eq(stakes.itemDocId, itemId.toString()),
          eq(stakes.categorySlug, categorySlug),
          eq(stakes.epochId, epochId),
          eq(stakes.status, 'active')
        )
      );

    const totalOnItem = itemStakes.reduce((sum, s) => sum + (s.amount || 0), 0);

    // Get total staked in entire category in this epoch
    const categoryStakes = await db
      .select()
      .from(stakes)
      .where(
        and(
          eq(stakes.categorySlug, categorySlug),
          eq(stakes.epochId, epochId),
          eq(stakes.status, 'active')
        )
      );

    const totalInCategory = categoryStakes.reduce((sum, s) => sum + (s.amount || 0), 0);

    // Prevent division by zero
    if (totalInCategory === 0) {
      return {
        impliedProbability: 50,
        multiplier: 2.0,
        riskLevel: 'medium',
      };
    }

    // Calculate implied probability
    // Raw probability = (staked on item / total staked in category)
    let impliedProbability = Math.round((totalOnItem / totalInCategory) * 100);

    // Apply platform rake margin: multiply by (1 - 0.05) = 0.95
    impliedProbability = Math.round(impliedProbability * (1 - PLATFORM_RAKE_RATE));

    // Clamp to 1-99 (impossible to have 0% or 100% probability in a market)
    impliedProbability = Math.max(1, Math.min(99, impliedProbability));

    // Calculate multiplier: 1 / (probability / 100)
    let multiplier = 1 / (impliedProbability / 100);

    // Apply min/max caps
    multiplier = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, multiplier));

    // Round to 1 decimal place
    multiplier = Math.round(multiplier * 10) / 10;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (impliedProbability > 60) {
      riskLevel = 'low';
    } else if (impliedProbability >= 30) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return {
      impliedProbability,
      multiplier,
      riskLevel,
    };
  } catch (error) {
    console.error('[oddsCalculator] Error calculating odds:', error);
    // Return neutral odds on error
    return {
      impliedProbability: 50,
      multiplier: 2.0,
      riskLevel: 'medium',
    };
  }
}

/**
 * Batch calculate odds for multiple items
 */
export async function calculateMultipleOdds(
  itemIds: (string | number)[],
  categorySlug: string,
  epochId: number
): Promise<Record<string | number, OddsResult>> {
  const results: Record<string | number, OddsResult> = {};

  for (const itemId of itemIds) {
    const numId = typeof itemId === 'string' ? parseInt(itemId) : itemId;
    results[itemId] = await calculateOdds(numId, categorySlug, epochId);
  }

  return results;
}
