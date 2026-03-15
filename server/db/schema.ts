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
    varchar
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
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("stakes_user_idx").on(table.userId),
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
    walletAddress: varchar("wallet_address", { length: 42 }).unique(),
    balance: real("balance").default(0), // Starting balance
    reputation: integer("reputation").default(100),
    tier: text("tier").default("Initiate"), // Initiate, Peer, Sage, Oracle
    powerVotes: integer("power_votes").default(0),
    referralCode: text("referral_code").unique(),
    referredBy: text("referred_by"),
    oracleHandle: varchar('oracle_handle', { length: 30 }).unique(),
    proUntil: timestamp('pro_until'),
    referralEarnings: real("referral_earnings").default(0),
    isAdmin: boolean("is_admin").default(false),
    isModerator: boolean("is_moderator").default(false),
    isBanned: boolean("is_banned").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

// ===== BETA INVITES =====
export const betaInvites = pgTable("beta_invites", {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    used: boolean("used").default(false),
    isReusable: boolean("is_reusable").default(false),
    usedBy: varchar("used_by", { length: 128 }),
    usedAt: timestamp("used_at"),
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
