import {
    pgTable,
    text,
    integer,
    real,
    boolean,
    timestamp,
    jsonb,
    serial,
    uniqueIndex,
    index,
    varchar,
    date
} from "drizzle-orm/pg-core";

// ===== CATEGORIES =====
export const categories = pgTable("categories", {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    isFrozen: boolean("is_frozen").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

// ===== ITEMS =====
export const items = pgTable("items", {
    id: serial("id").primaryKey(),
    docId: text("doc_id").notNull().unique(), // e.g. "item_crypto_0"
    name: text("name").notNull(),
    symbol: text("symbol"),
    categorySlug: text("category_slug").notNull(),
    score: integer("score").default(0),
    velocity: real("velocity").default(0),
    momentum: real("momentum").default(0),
    volatility: real("volatility").default(5),
    rank: integer("rank").default(1),
    totalVotes: integer("total_votes").default(0),
    trend: jsonb("trend").$type<number[]>().default([]),
    imageUrl: text("image_url"),
    isDampened: boolean("is_dampened").default(false),
    status: text("status").default("active"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("items_category_idx").on(table.categorySlug),
    index("items_category_rank_idx").on(table.categorySlug, table.rank),
]);

// ===== VOTES =====
export const votes = pgTable("votes", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    itemDocId: text("item_doc_id").notNull(),
    categorySlug: text("category_slug").notNull(),
    direction: integer("direction").notNull(), // 1 or -1
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
    uniqueIndex("votes_user_item_idx").on(table.userId, table.itemDocId),
    index("votes_user_category_idx").on(table.userId, table.categorySlug),
    index("votes_item_idx").on(table.itemDocId),
    index("votes_user_updated_idx").on(table.userId, table.updatedAt),
]);

// ===== STAKES =====
export const stakes = pgTable("stakes", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    itemDocId: text("item_doc_id").notNull(),
    itemName: text("item_name"),
    categorySlug: text("category_slug").notNull(),
    amount: real("amount").notNull(),
    target: jsonb("target").notNull(),
    betType: text("bet_type").notNull(), // exact, range, directional
    initialRank: integer("initial_rank"),
    status: text("status").default("active"),
    epochId: integer("epoch_id"),
    impliedProbability: real("implied_probability"),
    effectiveMultiplier: real("effective_multiplier"),
    multiplierUsed: real("multiplier_used"),
    slippageApplied: real("slippage_applied"),
    payout: real("payout"),
    platformFee: real("platform_fee").default(0),
    outcome: text("outcome"),
    isSettled: boolean("is_settled").default(false),
    isPlayMode: boolean("is_play_mode").default(false), // True = uses virtual STAKE
    exitValue: real("exit_value"), // Payout from early exit
    exitAt: timestamp("exit_at"), // Time of early exit
    isDemo: boolean("is_demo").default(false), // Flag for practice/demo stakes
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("stakes_user_idx").on(table.userId),
    index("stakes_user_status_idx").on(table.userId, table.status),
    index("stakes_epoch_idx").on(table.epochId),
]);

// ===== EPOCHS =====
export const epochs = pgTable("epochs", {
    id: serial("id").primaryKey(),
    epochNumber: integer("epoch_number").notNull(),
    isActive: boolean("is_active").default(false),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    duration: integer("duration").notNull(), // ms
    createdAt: timestamp("created_at").defaultNow(),
});

// ===== EPOCH SNAPSHOTS =====
export const epochSnapshots = pgTable("epoch_snapshots", {
    id: serial("id").primaryKey(),
    epochId: integer("epoch_id").notNull(),
    itemId: text("item_id").notNull(),
    categorySlug: text("category_slug").notNull(),
    rank: integer("rank").notNull(),
    score: real("score").notNull(),
    velocity: real("velocity").default(0),
    openingRank: integer('opening_rank'),
    closingRank: integer('closing_rank'),
    rankChange: integer('rank_change'),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("epoch_snapshots_epoch_idx").on(table.epochId),
    index("epoch_snapshots_item_idx").on(table.itemId),
    index("snapshot_epoch_item_idx").on(table.epochId, table.itemId),
]);

// ===== MARKET META =====
export const marketMeta = pgTable("market_meta", {
    id: serial("id").primaryKey(),
    categorySlug: text("category_slug").notNull().unique(),
    totalStaked: real("total_staked").default(0),
    platformRevenue: real("platform_revenue").default(0),
    itemExposure: jsonb("item_exposure").$type<Record<string, number>>().default({}),
    createdAt: timestamp("created_at").defaultNow(),
});

// ===== USERS (synced from Firebase Auth) =====
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    firebaseUid: text("firebase_uid").notNull().unique(),
    email: text("email"),
    displayName: text("display_name"),
    bio: text("bio"),
    walletAddress: varchar("wallet_address", { length: 42 }).unique(),
    balance: real("balance").default(0), // Starting real balance
    playBalance: real("play_balance").default(10000), // Starting free-play balance
    reputation: integer("reputation").default(100),
    tier: text("tier").default("Initiate"), // Initiate, Peer, Sage, Oracle
    powerVotes: integer("power_votes").default(0),
    referralCode: text("referral_code").unique(),
    referredBy: text("referred_by"),
    oracleHandle: varchar('oracle_handle', { length: 30 }).unique(),
    oracleHandleChangeCount: integer("oracle_handle_change_count").default(0),
    oracleHandleChangeWindowStart: timestamp("oracle_handle_change_window_start"),
    proUntil: timestamp('pro_until'),
    referralEarnings: real("referral_earnings").default(0),
    isAdmin: boolean("is_admin").default(false),
    isModerator: boolean("is_moderator").default(false),
    isBanned: boolean("is_banned").default(false),
    dailyStreak: integer('daily_streak').default(0),
    longestStreak: integer('longest_streak').default(0),
    lastActiveDate: timestamp('last_active_date'),
    demoBalance: integer('demo_balance').default(50000), // Practice credits (NGN value)
    demoTotalWon: integer('demo_total_won').default(0),
    demoTotalStaked: integer('demo_total_staked').default(0),
    demoStakesCount: integer('demo_stakes_count').default(0),
    demoWinsCount: integer('demo_wins_count').default(0),
    isDemoMode: boolean('is_demo_mode').default(true), // Users start in demo mode
    hasCompletedTour: boolean('has_completed_tour').default(false),
    hasDeposited: boolean('has_deposited').default(false),
    demoConversionShown: boolean('demo_conversion_shown').default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

// ===== VOTE PACKS =====
export const votePacks = pgTable("vote_packs", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    votes: integer("votes").notNull(),
    priceNgn: integer("price_ngn").notNull(),
    active: boolean("active").default(true),
});

// ===== SPONSORED ITEMS =====
export const sponsoredItems = pgTable("sponsored_items", {
    id: serial("id").primaryKey(),
    itemId: varchar("item_id", { length: 255 }).notNull(),
    categorySlug: varchar("category_slug", { length: 255 }).notNull(),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    priceNgn: integer("price_ngn").notNull(),
    label: varchar("label", { length: 50 }).default("SPONSORED"),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
});
// ===== NOTIFICATIONS PATTERN =====
export const notifications = pgTable("notifications", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").default("general"), // general, security, win, loss, epoch
    read: boolean("read").default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notif_user_read_idx").on(table.userId, table.read),
]);

// ===== TRANSACTIONS (The Financial Ledger) =====
export const transactions = pgTable("transactions", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(), // deposit, withdrawal, stake, win, fee, refund
    amountNgn: real("amount_ngn").default(0),
    amountUsd: real("amount_usd").default(0),
    platformFeeUsd: real("platform_fee_usd").default(0),
    netAmountUsd: real("net_amount_usd").default(0),
    status: text("status").default("pending"), // pending, completed, failed
    reference: text("reference").notNull().unique(), // Internal or Paystack ref
    paystackRef: text("paystack_ref"),
    metadata: jsonb("metadata").default({}),
    epochId: integer("epoch_id"),
    marketId: text("market_id"),
    createdAt: timestamp("created_at").defaultNow(),
    settledAt: timestamp("settled_at"),
}, (table) => [
    index("transactions_user_idx").on(table.userId),
    index("transactions_ref_idx").on(table.reference),
]);

// ===== PLATFORM REVENUE (Epoch Level Summary) =====
export const platformRevenue = pgTable("platform_revenue", {
    id: serial("id").primaryKey(),
    epochId: integer("epoch_id").notNull().unique(),
    grossStakedUsd: real("gross_staked_usd").default(0),
    totalFeesUsd: real("total_fees_usd").default(0),
    totalWinningsUsd: real("total_winnings_usd").default(0),
    netProfitUsd: real("net_profit_usd").default(0),
    recordedAt: timestamp("recorded_at").defaultNow(),
});
// ===== MARKET ACTIVITY (Public Feed / Audit Log) =====
export const marketActivity = pgTable("market_activity", {
    id: serial("id").primaryKey(),
    type: text("type").notNull(), // stake, vote, epoch_roll, settlement, deposit
    userId: text("user_id"),
    itemDocId: text("item_doc_id"),
    itemName: text("item_name"),
    categorySlug: text("category_slug"),
    amount: real("amount"),
    description: text("description"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("market_activity_type_idx").on(table.type),
    index("market_activity_created_idx").on(table.createdAt),
]);

// ===== WITHDRAWALS =====
export const withdrawals = pgTable('withdrawals', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    amount: integer('amount').notNull(),
    bankCode: varchar('bank_code', { length: 10 }).notNull(),
    accountNumber: varchar('account_number', { length: 10 }).notNull(),
    accountName: varchar('account_name', { length: 100 }).notNull(),
    paystackRef: varchar('paystack_ref', { length: 100 }),
    status: varchar('status', { length: 20 }).default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// ===== ADMIN STATE / CONFIG =====
export const adminConfig = pgTable("admin_config", {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(), // e.g., 'global_state'
    killswitch: boolean("killswitch").default(false),
    epochsPaused: boolean("epochs_paused").default(false),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// ===== COMMENTS (Market Discussion) =====
export const comments = pgTable("comments", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    itemDocId: text("item_doc_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("comments_item_idx").on(table.itemDocId),
]);

// ===== WATCHLIST =====
export const watchlist = pgTable('watchlist', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    itemDocId: text('item_doc_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('watchlist_user_idx').on(table.userId),
    index('watchlist_item_idx').on(table.itemDocId),
]);

// ===== PRICE ALERTS =====
export const priceAlerts = pgTable('price_alerts', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    itemDocId: text('item_doc_id').notNull(),
    alertType: varchar('alert_type', { length: 20 }).notNull(), // rank_above | rank_below | momentum_spike
    threshold: integer('threshold').notNull(),
    triggered: boolean('triggered').default(false),
    active: boolean('active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('price_alerts_user_idx').on(table.userId),
    index('price_alerts_active_idx').on(table.active),
]);

// ===== ACHIEVEMENTS =====
export const achievements = pgTable('achievements', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    unlockedAt: timestamp('unlocked_at').defaultNow(),
    metadata: jsonb('metadata'),
}, (table) => [
    index('achievements_user_idx').on(table.userId),
]);

// ===== MARKET COMMENTS =====
export const marketComments = pgTable('market_comments', {
  id:        serial('id').primaryKey(),
  itemId:    integer('item_id').references(() => items.id).notNull(),
  userId:    text('user_id').notNull(),
  content:   text('content').notNull(),
  parentId:  integer('parent_id'),
  likes:     integer('likes').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index("market_comments_item_idx").on(table.itemId),
]);

// ===== ORACLE BATTLES =====
export const oracleBattles = pgTable('oracle_battles', {
  id:          serial('id').primaryKey(),
  creatorId:   text('creator_id'),
  title:       varchar('title', { length: 100 }).notNull(),
  itemAId:     integer('item_a_id').references(() => items.id),
  itemBId:     integer('item_b_id').references(() => items.id),
  categoryId:  integer('category_id').references(() => categories.id),
  question:    varchar('question', { length: 200 }).notNull(),
  endsAt:      timestamp('ends_at').notNull(),
  status:      varchar('status', { length: 20 }).default('active'),
  totalVotesA: integer('total_votes_a').default(0),
  totalVotesB: integer('total_votes_b').default(0),
  createdAt:   timestamp('created_at').defaultNow(),
});

// ===== DAILY QUESTS =====
export const dailyQuests = pgTable('daily_quests', {
  id:          serial('id').primaryKey(),
  userId:      text('user_id').notNull(),
  questDate:   date('quest_date').notNull(),
  votedToday:  boolean('voted_today').default(false),
  stakedToday: boolean('staked_today').default(false),
  commentedToday: boolean('commented_today').default(false),
  checkedInToday: boolean('checked_in_today').default(false),
  claimed:     boolean('claimed').default(false),
  xpEarned:    integer('xp_earned').default(0),
}, (table) => [
    uniqueIndex('daily_quests_user_date_idx').on(table.userId, table.questDate)
]);

// ===== ORACLE TRIALS =====
export const oracleTrials = pgTable('oracle_trials', {
  id:         serial('id').primaryKey(),
  trialDate:  date('trial_date').unique().notNull(),
  itemIds:    jsonb('item_ids').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
});

export const trialAttempts = pgTable('trial_attempts', {
  id:           serial('id').primaryKey(),
  userId:       text('user_id').notNull(),
  trialId:      integer('trial_id').references(() => oracleTrials.id),
  guessOrder:   jsonb('guess_order').notNull(),
  score:        integer('score').notNull(),
  completedAt:  timestamp('completed_at').defaultNow(),
}, (table) => [
    uniqueIndex('trial_attempts_user_trial_idx').on(table.userId, table.trialId)
]);

// ===== SEASONS =====
export const seasons = pgTable('seasons', {
  id:          serial('id').primaryKey(),
  name:        varchar('name', { length: 50 }).notNull(),
  startDate:   date('start_date').notNull(),
  endDate:     date('end_date').notNull(),
  status:      varchar('status', { length: 20 }).default('active'),
});

export const seasonLeaderboard = pgTable('season_leaderboard', {
  id:          serial('id').primaryKey(),
  seasonId:    integer('season_id').references(() => seasons.id),
  userId:      text('user_id').notNull(),
  seasonXP:    integer('season_xp').default(0),
  seasonRank:  integer('season_rank'),
  tier:        varchar('tier', { length: 20 }).default('apprentice'),
}, (table) => [
    uniqueIndex('season_leaderboard_user_season_idx').on(table.userId, table.seasonId)
]);
