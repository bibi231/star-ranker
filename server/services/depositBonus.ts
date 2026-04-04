import { db } from '../db/index.js';
import { users, notifications, transactions } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { getRates } from './currencyRate.js';

export async function handleFirstDepositBonus(userId: string, amountNgn: number, tx: any) {
  const userResult = await tx.select().from(users).where(eq(users.firebaseUid, userId)).limit(1).for('update');
  const user = userResult[0];
  
  if (!user || user.hasDeposited) return;

  // Mark as deposited regardless of amount to prevent future bonuses
  await tx.update(users)
    .set({ 
      hasDeposited: true,
      isDemoMode: false // Switch to real mode on first deposit
    })
    .where(eq(users.firebaseUid, userId));

  // If deposit >= 2,000 NGN, give 500 NGN bonus
  if (amountNgn >= 2000) {
    const liveRates = getRates();
    const liveNgnUsdRate = liveRates.NGN_USD > 0 ? (1 / liveRates.NGN_USD) : 1500;
    const bonusCredits = Math.floor((500 / liveNgnUsdRate) * 100) / 100;

    await tx.update(users)
      .set({ balance: sql`${users.balance} + ${bonusCredits}` })
      .where(eq(users.firebaseUid, userId));

    await tx.insert(transactions).values({
      userId,
      type: 'bonus',
      amountNgn: 500,
      amountUsd: bonusCredits,
      reference: `bonus_first_dep_${Date.now()}`,
      status: 'completed',
      metadata: { reason: 'First deposit bonus (2k+ NGN)' }
    });

    await tx.insert(notifications).values({
      userId,
      type: 'system',
      title: 'Welcome Bonus Credited! ₦500',
      message: 'Thanks for your first deposit! We\'ve added ₦500 bonus credits to your wallet. You are now in Real Mode.',
    });
  } else {
    // Just notify about Real Mode
    await tx.insert(notifications).values({
      userId,
      type: 'system',
      title: 'Real Mode Activated!',
      message: 'Your deposit was successful. You are now playing with real money! Good luck.',
    });
  }
}
