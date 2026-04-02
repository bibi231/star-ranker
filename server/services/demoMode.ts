import { db } from '../db';
import { users, stakes, notifications } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const DEMO_STARTING_BALANCE = 50000; // 50,000 play credits

// Reset demo balance if user has run out
export async function checkAndRefillDemoBalance(userId: string): Promise<void> {
  const userResult = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  const user = userResult[0];
  if (!user) return;
  
  // If demo balance < 500, top up back to 10,000
  if (user.isDemoMode && (user.demoBalance || 0) < 500) {
    await db.update(users)
      .set({ demoBalance: 10000 })
      .where(eq(users.firebaseUid, userId));
    
    // Create notification
    await db.insert(notifications).values({
      userId,
      type: 'system',
      title: 'Demo Balance Topped Up!',
      message: 'Your demo credits have been refilled to 10,000. Keep practicing!',
    });
  }
}

// Switch user from demo to real mode
export async function activateRealMode(userId: string): Promise<void> {
  await db.update(users)
    .set({ isDemoMode: false })
    .where(eq(users.firebaseUid, userId));
}

// Get demo stats for conversion prompt
export async function getDemoStats(userId: string) {
  const userResult = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  const user = userResult[0];

  const demoStakes = await db.select().from(stakes).where(
    and(eq(stakes.userId, userId), eq(stakes.isDemo, true))
  );
  
  const won = demoStakes.filter(s => s.status === 'won');
  const totalEarned = won.reduce((sum, s) => sum + (s.payout || 0), 0);
  
  return {
    stakesPlaced: demoStakes.length,
    winsCount: won.length,
    totalEarned,
    winRate: demoStakes.length > 0 ? Math.round((won.length / demoStakes.length) * 100) : 0,
    demoBalance: user?.demoBalance || 0,
  };
}

export async function checkAndShowConversionPrompt(userId: string): Promise<boolean> {
  const userResult = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  const user = userResult[0];
  if (!user || user.hasDeposited || user.demoConversionShown) return false;
  
  // Show conversion prompt after first demo win OR after 3 demo stakes
  if ((user.demoWinsCount || 0) >= 1 || (user.demoStakesCount || 0) >= 3) {
    await db.update(users)
      .set({ demoConversionShown: true })
      .where(eq(users.firebaseUid, userId));
    return true;
  }
  return false;
}
