/**
 * User Portfolio Route — Full P&L Dashboard Data
 * GET /api/user/portfolio
 */

import { Router } from 'express';
import { db } from '../db/index.js';
import { users, stakes, transactions } from '../db/schema.js';
import { eq, and, desc, lte, gte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { calculateOdds } from '../engine/oddsCalculator.js';

const router = Router();

// GET /api/user/portfolio — Full financial picture
router.get('/portfolio', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.uid;

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all stakes for this user
    const userStakes = await db
      .select()
      .from(stakes)
      .where(eq(stakes.userId, userId))
      .orderBy(desc(stakes.createdAt));

    // Separate open and closed positions
    const openPositions = userStakes.filter(s => !s.isSettled || s.status === 'active');
    const closedPositions = userStakes.filter(s => s.isSettled && s.outcome);

    // Get all transactions for this user
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));

    // Calculate summary stats
    const totalDeposited = userTransactions
      .filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amountNgn || 0), 0);

    const totalStaked = userStakes
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const wonStakes = closedPositions.filter(s => s.outcome === 'won');
    const lostStakes = closedPositions.filter(s => s.outcome === 'lost');

    const totalWon = wonStakes.reduce((sum, s) => sum + (s.payout || 0), 0);
    const totalLost = lostStakes.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalFees = userTransactions
      .filter(t => t.type === 'fee')
      .reduce((sum, t) => sum + (t.amountNgn || 0), 0);

    const netPnL = totalWon - totalLost - totalFees;
    const winRate = userStakes.length > 0 
      ? Math.round((wonStakes.length / userStakes.length) * 100)
      : 0;

    // Calculate unrealised value (estimated payout at current odds)
    let unrealisedValue = 0;
    const now = new Date();
    for (const position of openPositions) {
      if (position.amount && position.categorySlug && position.epochId) {
        try {
          const odds = await calculateOdds(
            parseInt(position.itemDocId),
            position.categorySlug,
            position.epochId
          );
          unrealisedValue += position.amount * odds.multiplier;
        } catch (err) {
          // Silently skip if odds calculation fails
        }
      }
    }

    // Format open positions
    const formattedOpenPositions = openPositions.slice(0, 50).map(stake => ({
      stakeId: stake.id,
      itemName: stake.itemName,
      categoryName: stake.categorySlug,
      stakeType: stake.betType,
      prediction: stake.target,
      amount: stake.amount,
      platformFee: stake.platformFee || 0,
      netAmount: (stake.amount || 0) - (stake.platformFee || 0),
      openingRank: stake.initialRank,
      currentRank: 1, // Would need to fetch current item rank
      currentProbability: stake.impliedProbability || 50,
      currentMultiplier: stake.multiplierUsed || 1,
      unrealisedPnL: stake.payout ? (stake.payout - stake.amount) : 0,
      epochEndsAt: new Date(), // Would fetch from epochs table
      placedAt: stake.createdAt,
    }));

    // Format closed positions
    const formattedClosedPositions = closedPositions.slice(0, 20).map(stake => ({
      stakeId: stake.id,
      itemName: stake.itemName,
      categoryName: stake.categorySlug,
      stakeType: stake.betType,
      prediction: stake.target,
      amount: stake.amount,
      payout: stake.payout || 0,
      result: stake.outcome,
      settledAt: stake.createdAt,
      epochId: stake.epochId,
    }));

    // Format activity feed
    const activityFeed = userTransactions.slice(0, 30).map(tx => {
      const icons: Record<string, string> = {
        deposit: '??',
        withdrawal: '??',
        stake: '??',
        win: '??',
        loss: '??',
        fee: '??',
      };
      return {
        type: tx.type,
        amount: tx.amountNgn || 0,
        description: `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} ${tx.reference}`,
        timestamp: tx.createdAt,
        icon: icons[tx.type] || '??',
      };
    });

    res.json({
      summary: {
        balance: user.balance || 0,
        totalDeposited,
        totalStaked,
        totalWon,
        totalLost,
        netPnL,
        winRate,
        activeStakesCount: openPositions.length,
        unrealisedValue,
      },
      openPositions: formattedOpenPositions,
      closedPositions: formattedClosedPositions,
      activityFeed,
    });
  } catch (error: any) {
    console.error('[portfolio] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
