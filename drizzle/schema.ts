import { pgTable, serial, integer, boolean, timestamp, unique, text, index, uniqueIndex, real, jsonb, varchar, foreignKey, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const epochs = pgTable("epochs", {
	id: serial().primaryKey().notNull(),
	epochNumber: integer("epoch_number").notNull(),
	isActive: boolean("is_active").default(false),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	duration: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

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
	isAdmin: boolean("is_admin").default(false),
	isModerator: boolean("is_moderator").default(false),
	oracleHandle: varchar("oracle_handle", { length: 30 }),
	proUntil: timestamp("pro_until", { mode: 'string' }),
	oracleHandleChangeCount: integer("oracle_handle_change_count").default(0),
	oracleHandleChangeWindowStart: timestamp("oracle_handle_change_window_start", { mode: 'string' }),
	bio: text(),
}, (table) => [
	unique("users_firebase_uid_unique").on(table.firebaseUid),
	unique("users_referral_code_unique").on(table.referralCode),
	unique("users_wallet_address_unique").on(table.walletAddress),
	unique("users_oracle_handle_key").on(table.oracleHandle),
]);

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

export const betaInvites = pgTable("beta_invites", {
	id: serial().primaryKey().notNull(),
	code: varchar({ length: 20 }).notNull(),
	used: boolean().default(false),
	usedBy: varchar("used_by", { length: 128 }),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	isReusable: boolean("is_reusable").default(false),
}, (table) => [
	unique("beta_invites_code_unique").on(table.code),
]);

export const stakes = pgTable("stakes", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	itemDocId: text("item_doc_id").notNull(),
	itemName: text("item_name"),
	categorySlug: text("category_slug").notNull(),
	amount: real().notNull(),
	target: jsonb().notNull(),
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

export const adminConfig = pgTable("admin_config", {
	id: serial().primaryKey().notNull(),
	key: text().notNull(),
	killswitch: boolean().default(false),
	epochsPaused: boolean("epochs_paused").default(false),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("admin_config_key_key").on(table.key),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	message: text().notNull(),
	type: text().default('general'),
	read: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	metadata: jsonb(),
}, (table) => [
	index("notifications_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const marketComments = pgTable("market_comments", {
	id: serial().primaryKey().notNull(),
	itemId: integer("item_id").notNull(),
	userId: text("user_id").notNull(),
	content: text().notNull(),
	parentId: integer("parent_id"),
	likes: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "market_comments_item_id_fkey"
		}),
]);

export const oracleBattles = pgTable("oracle_battles", {
	id: serial().primaryKey().notNull(),
	creatorId: text("creator_id"),
	title: varchar({ length: 100 }).notNull(),
	itemAId: integer("item_a_id"),
	itemBId: integer("item_b_id"),
	categoryId: integer("category_id"),
	question: varchar({ length: 200 }).notNull(),
	endsAt: timestamp("ends_at", { mode: 'string' }).notNull(),
	status: varchar({ length: 20 }).default('active'),
	totalVotesA: integer("total_votes_a").default(0),
	totalVotesB: integer("total_votes_b").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.itemAId],
			foreignColumns: [items.id],
			name: "oracle_battles_item_a_id_fkey"
		}),
	foreignKey({
			columns: [table.itemBId],
			foreignColumns: [items.id],
			name: "oracle_battles_item_b_id_fkey"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "oracle_battles_category_id_fkey"
		}),
]);

export const dailyQuests = pgTable("daily_quests", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	questDate: date("quest_date").notNull(),
	votedToday: boolean("voted_today").default(false),
	stakedToday: boolean("staked_today").default(false),
	commentedToday: boolean("commented_today").default(false),
	checkedInToday: boolean("checked_in_today").default(false),
	xpEarned: integer("xp_earned").default(0),
}, (table) => [
	unique("daily_quests_user_id_quest_date_key").on(table.userId, table.questDate),
]);

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
	index("transactions_ref_idx").using("btree", table.reference.asc().nullsLast().op("text_ops")),
	index("transactions_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("transactions_reference_unique").on(table.reference),
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
	openingRank: integer("opening_rank"),
	closingRank: integer("closing_rank"),
	rankChange: integer("rank_change"),
}, (table) => [
	index("epoch_snapshots_epoch_idx").using("btree", table.epochId.asc().nullsLast().op("int4_ops")),
	index("epoch_snapshots_item_idx").using("btree", table.itemId.asc().nullsLast().op("text_ops")),
]);

export const withdrawals = pgTable("withdrawals", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	amount: integer().notNull(),
	bankCode: varchar("bank_code", { length: 10 }).notNull(),
	accountNumber: varchar("account_number", { length: 10 }).notNull(),
	accountName: varchar("account_name", { length: 100 }).notNull(),
	paystackRef: varchar("paystack_ref", { length: 100 }),
	status: varchar({ length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const comments = pgTable("comments", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	itemDocId: text("item_doc_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("comments_item_idx").using("btree", table.itemDocId.asc().nullsLast().op("text_ops")),
]);

export const marketActivity = pgTable("market_activity", {
	id: serial().primaryKey().notNull(),
	type: text().notNull(),
	userId: text("user_id"),
	itemDocId: text("item_doc_id"),
	itemName: text("item_name"),
	categorySlug: text("category_slug"),
	amount: real(),
	description: text(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("market_activity_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("market_activity_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const oracleTrials = pgTable("oracle_trials", {
	id: serial().primaryKey().notNull(),
	trialDate: date("trial_date").notNull(),
	itemIds: jsonb("item_ids").notNull(),
	categoryId: integer("category_id"),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "oracle_trials_category_id_fkey"
		}),
	unique("oracle_trials_trial_date_key").on(table.trialDate),
]);

export const trialAttempts = pgTable("trial_attempts", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	trialId: integer("trial_id"),
	guessOrder: jsonb("guess_order").notNull(),
	score: integer().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.trialId],
			foreignColumns: [oracleTrials.id],
			name: "trial_attempts_trial_id_fkey"
		}),
	unique("trial_attempts_user_id_trial_id_key").on(table.userId, table.trialId),
]);

export const seasons = pgTable("seasons", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	status: varchar({ length: 20 }).default('active'),
});

export const seasonLeaderboard = pgTable("season_leaderboard", {
	id: serial().primaryKey().notNull(),
	seasonId: integer("season_id"),
	userId: text("user_id").notNull(),
	seasonXp: integer("season_xp").default(0),
	seasonRank: integer("season_rank"),
	tier: varchar({ length: 20 }).default('apprentice'),
}, (table) => [
	foreignKey({
			columns: [table.seasonId],
			foreignColumns: [seasons.id],
			name: "season_leaderboard_season_id_fkey"
		}),
	unique("season_leaderboard_user_id_season_id_key").on(table.seasonId, table.userId),
]);
