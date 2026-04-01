import { db } from '../db/index';
import { users, achievements, stakes, notifications, transactions } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const ACHIEVEMENT_DEFS: Record<string, { icon: string; title: string; desc: string }> = {
  FIRST_STAKE:   { icon: '🩸', title: 'First Blood',      desc: 'Placed your first stake' },
  FIRST_WIN:     { icon: '👁', title: 'Oracle Awakened',  desc: 'Won your first stake' },
  THREE_STREAK:  { icon: '🔥', title: 'Momentum',         desc: '3 correct calls in a row' },
  FIVE_STREAK:   { icon: '⚡', title: 'On Fire',           desc: '5 correct calls in a row' },
  TEN_STREAK:    { icon: '💫', title: 'Unstoppable',       desc: '10 correct calls in a row' },
  TOP_100:       { icon: '📈', title: 'Rising Oracle',     desc: 'Reached top 100 leaderboard' },
  TOP_10:        { icon: '🌟', title: 'Elite Oracle',      desc: 'Reached top 10 leaderboard' },
  WHALE:         { icon: '🐋', title: 'Whale',             desc: 'Staked ₦50,000+ in one epoch' },
  DAILY_7:       { icon: '📅', title: 'Committed',         desc: '7-day activity streak' },
  DAILY_30:      { icon: '💎', title: 'Dedicated',         desc: '30-day activity streak' },
  PERFECT_EPOCH: { icon: '✨', title: 'Perfect Oracle',    desc: 'All stakes correct in one epoch' },
  FIRST_DEPOSIT: { icon: '💰', title: 'Funded',            desc: 'Made your first deposit' },
};

async function getUserStats(userId: string) {
    // Collect stakes
    const userStakes = await db.select().from(stakes).where(eq(stakes.userId, userId)).orderBy(desc(stakes.createdAt));
    
    let wonCount = 0;
    let currentStreak = 0;
    let maxSingleEpochStake = 0;
    const epochStakesMap: Record<number, number> = {};
    const epochWinsMap: Record<number, number> = {};
    const epochTotalMap: Record<number, number> = {};

    for (const stake of userStakes) {
        if (stake.status === "won") wonCount++;
        
        // Accumulate single epoch stakes
        if (stake.epochId) {
            epochStakesMap[stake.epochId] = (epochStakesMap[stake.epochId] || 0) + stake.amountNgn;
            maxSingleEpochStake = Math.max(maxSingleEpochStake, epochStakesMap[stake.epochId]);
            
            epochTotalMap[stake.epochId] = (epochTotalMap[stake.epochId] || 0) + 1;
            if (stake.status === "won") {
                epochWinsMap[stake.epochId] = (epochWinsMap[stake.epochId] || 0) + 1;
            }
        }
    }

    // Calculate winning streak (from newest to oldest)
    for (const stake of userStakes) {
        if (stake.status === "won") {
            currentStreak++;
        } else if (stake.status === "lost") {
            break; // Streak broken
        }
    }

    // Check perfect epoch
    let hasPerfectEpoch = false;
    for (const epochId in epochTotalMap) {
        if (epochTotalMap[epochId] >= 3 && epochWinsMap[epochId] === epochTotalMap[epochId]) { // E.g. min 3 stakes
            hasPerfectEpoch = true;
            break;
        }
    }

    // Collect deposits
    const userDeposits = await db.select().from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.type, "deposit"), eq(transactions.status, "completed")));

    // Collect User Profile
    const userProfile = await db.query.users.findFirst({ where: eq(users.firebaseUid, userId) });

    return {
        totalStakes: userStakes.length,
        wonCount,
        totalDeposits: userDeposits.length,
        currentStreak,
        maxSingleEpochStake,
        hasPerfectEpoch,
        dailyStreak: userProfile?.dailyStreak || 0
    };
}

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
    try {
        const stats = await getUserStats(userId);
        const existingRaw = await db.select().from(achievements).where(eq(achievements.userId, userId));
        const existingIds = new Set(existingRaw.map(a => a.type));
        
        const awarded: string[] = [];
        const toAward: string[] = [];

        // Check conditions
        if (stats.totalStakes >= 1 && !existingIds.has("FIRST_STAKE")) toAward.push("FIRST_STAKE");
        if (stats.wonCount >= 1 && !existingIds.has("FIRST_WIN")) toAward.push("FIRST_WIN");
        if (stats.currentStreak >= 3 && !existingIds.has("THREE_STREAK")) toAward.push("THREE_STREAK");
        if (stats.currentStreak >= 5 && !existingIds.has("FIVE_STREAK")) toAward.push("FIVE_STREAK");
        if (stats.currentStreak >= 10 && !existingIds.has("TEN_STREAK")) toAward.push("TEN_STREAK");
        if (stats.maxSingleEpochStake >= 50000 && !existingIds.has("WHALE")) toAward.push("WHALE");
        if (stats.dailyStreak >= 7 && !existingIds.has("DAILY_7")) toAward.push("DAILY_7");
        if (stats.dailyStreak >= 30 && !existingIds.has("DAILY_30")) toAward.push("DAILY_30");
        if (stats.hasPerfectEpoch && !existingIds.has("PERFECT_EPOCH")) toAward.push("PERFECT_EPOCH");
        if (stats.totalDeposits >= 1 && !existingIds.has("FIRST_DEPOSIT")) toAward.push("FIRST_DEPOSIT");

        // Award new ones
        for (const type of toAward) {
            const def = ACHIEVEMENT_DEFS[type];
            if (!def) continue;

            await db.insert(achievements).values({
                userId,
                type,
                unlockedAt: new Date()
            }).onConflictDoNothing();

            await db.insert(notifications).values({
                userId,
                type: 'achievement',
                title: 'Achievement Unlocked!',
                message: `${def.icon} ${def.title} - ${def.desc}`,
                metadata: { achievementType: type }
            });

            awarded.push(type);
        }

        return awarded;
    } catch (err: any) {
        console.error('[checkAndAwardAchievements failed]', err.message);
        return [];
    }
}

export async function updateDailyStreak(userId: string): Promise<void> {
    try {
        const userProfile = await db.query.users.findFirst({ where: eq(users.firebaseUid, userId) });
        if (!userProfile) return;

        const now = new Date();
        const lastActive = userProfile.lastActiveDate || new Date(0);
        
        // Reset to midnight for clean day comparisons
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

        const diffTime = Math.abs(today.getTime() - lastActiveDay.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        let newStreak = userProfile.dailyStreak || 0;

        if (diffDays === 1) {
            // Yesterday
            newStreak += 1;
        } else if (diffDays > 1) {
            // Missed a day
            newStreak = 1;
        }

        if (diffDays > 0) {
            await db.update(users).set({
                dailyStreak: newStreak,
                lastActiveDate: now
            }).where(eq(users.firebaseUid, userId));

            // Check if streak unlocks happened because of this:
            if (newStreak === 7 || newStreak === 30) {
                 await checkAndAwardAchievements(userId);
            }
        }
    } catch (err: any) {
        console.error('[updateDailyStreak failed]', err.message);
    }
}
