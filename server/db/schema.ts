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
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("notifications_user_idx").on(table.userId),
]);
