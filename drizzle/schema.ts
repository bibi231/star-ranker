import { pgTable, unique, serial, text, boolean, timestamp, integer, index, real, jsonb, varchar, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	title: text().notNull(),
	description: text(),
	isFrozen: boolean("is_frozen").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("categories_slug_unique").on(table.slug),
]);

export const epochs = pgTable("epochs", {
	id: serial().primaryKey().notNull(),
	epochNumber: integer("epoch_number").notNull(),
	isActive: boolean("is_active").default(false),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	duration: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const items = pgTable("items", {
	id: serial().primaryKey().notNull(),
	docId: text("doc_id").notNull(),
	name: text().notNull(),
	symbol: text(),
	categorySlug: text("category_slug").notNull(),
	score: integer().default(0),
	velocity: real().default(0),
	momentum: real().default(0),
	volatility: real().default(5),
	rank: integer().default(1),
	totalVotes: integer("total_votes").default(0),
	trend: jsonb().default([]),
	imageUrl: text("image_url"),
	isDampened: boolean("is_dampened").default(false),
	status: text().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("items_category_idx").using("btree", table.categorySlug.asc().nullsLast().op("text_ops")),
	unique("items_doc_id_unique").on(table.docId),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	firebaseUid: text("firebase_uid").notNull(),
	email: text(),
	displayName: text("display_name"),
	balance: real().default(0),
	reputation: integer().default(100),
	tier: text().default('Initiate'),
	isBanned: boolean("is_banned").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	powerVotes: integer("power_votes").default(0),
	referralCode: text("referral_code"),
	referredBy: text("referred_by"),
	referralEarnings: real("referral_earnings").default(0),
	walletAddress: varchar("wallet_address", { length: 42 }),
	oracleHandle: varchar("oracle_handle", { length: 30 }),
	oracleHandleChangeCount: integer("oracle_handle_change_count").default(0),
	oracleHandleChangeWindowStart: timestamp("oracle_handle_change_window_start", { mode: 'string' }),
}, (table) => [
	unique("users_firebase_uid_unique").on(table.firebaseUid),
	unique("users_referral_code_unique").on(table.referralCode),
	unique("users_wallet_address_unique").on(table.walletAddress),
	unique("users_oracle_handle_unique").on(table.oracleHandle),
]);

export const votes = pgTable("votes", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	itemDocId: text("item_doc_id").notNull(),
	categorySlug: text("category_slug").notNull(),
	direction: integer().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("votes_user_category_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.categorySlug.asc().nullsLast().op("text_ops")),
	uniqueIndex("votes_user_item_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.itemDocId.asc().nullsLast().op("text_ops")),
]);

export const marketMeta = pgTable("market_meta", {
	id: serial().primaryKey().notNull(),
	categorySlug: text("category_slug").notNull(),
	totalStaked: real("total_staked").default(0),
	itemExposure: jsonb("item_exposure").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	platformRevenue: real("platform_revenue").default(0),
}, (table) => [
	unique("market_meta_category_slug_unique").on(table.categorySlug),
]);

export const stakes = pgTable("stakes", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	itemDocId: text("item_doc_id").notNull(),
	itemName: text("item_name"),
	categorySlug: text("category_slug").notNull(),
	amount: real().notNull(),
	target: integer().notNull(),
	betType: text("bet_type").notNull(),
	initialRank: integer("initial_rank"),
	status: text().default('active'),
	epochId: integer("epoch_id"),
	impliedProbability: real("implied_probability"),
	effectiveMultiplier: real("effective_multiplier"),
	multiplierUsed: real("multiplier_used"),
	slippageApplied: real("slippage_applied"),
	payout: real(),
	outcome: text(),
	isSettled: boolean("is_settled").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	platformFee: real("platform_fee").default(0),
}, (table) => [
	index("stakes_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const votePacks = pgTable("vote_packs", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	votes: integer().notNull(),
	priceNgn: integer("price_ngn").notNull(),
	active: boolean().default(true),
});

export const sponsoredItems = pgTable("sponsored_items", {
	id: serial().primaryKey().notNull(),
	itemId: varchar("item_id", { length: 255 }).notNull(),
	categorySlug: varchar("category_slug", { length: 255 }).notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	priceNgn: integer("price_ngn").notNull(),
	label: varchar({ length: 50 }).default('SPONSORED'),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	message: text().notNull(),
	type: text().default('general'),
	read: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("notifications_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const epochSnapshots = pgTable("epoch_snapshots", {
	id: serial().primaryKey().notNull(),
	epochId: integer("epoch_id").notNull(),
	itemId: text("item_id").notNull(),
	categorySlug: text("category_slug").notNull(),
	rank: integer().notNull(),
	score: real().notNull(),
	velocity: real().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const platformRevenue = pgTable("platform_revenue", {
	id: serial().primaryKey().notNull(),
	epochId: integer("epoch_id").notNull(),
	grossStakedUsd: real("gross_staked_usd").default(0),
	totalFeesUsd: real("total_fees_usd").default(0),
	totalWinningsUsd: real("total_winnings_usd").default(0),
	netProfitUsd: real("net_profit_usd").default(0),
	recordedAt: timestamp("recorded_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("platform_revenue_epoch_id_unique").on(table.epochId),
]);

export const transactions = pgTable("transactions", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	type: text().notNull(),
	amountNgn: real("amount_ngn").default(0),
	amountUsd: real("amount_usd").default(0),
	platformFeeUsd: real("platform_fee_usd").default(0),
	netAmountUsd: real("net_amount_usd").default(0),
	status: text().default('pending'),
	reference: text().notNull(),
	paystackRef: text("paystack_ref"),
	metadata: jsonb().default({}),
	epochId: integer("epoch_id"),
	marketId: text("market_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	settledAt: timestamp("settled_at", { mode: 'string' }),
}, (table) => [
	unique("transactions_reference_unique").on(table.reference),
]);
