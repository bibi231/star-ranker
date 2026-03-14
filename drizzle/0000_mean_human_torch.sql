-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_frozen" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "epochs" (
	"id" serial PRIMARY KEY NOT NULL,
	"epoch_number" integer NOT NULL,
	"is_active" boolean DEFAULT false,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_id" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text,
	"category_slug" text NOT NULL,
	"score" integer DEFAULT 0,
	"velocity" real DEFAULT 0,
	"momentum" real DEFAULT 0,
	"volatility" real DEFAULT 5,
	"rank" integer DEFAULT 1,
	"total_votes" integer DEFAULT 0,
	"trend" jsonb DEFAULT '[]'::jsonb,
	"image_url" text,
	"is_dampened" boolean DEFAULT false,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "items_doc_id_unique" UNIQUE("doc_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"email" text,
	"display_name" text,
	"balance" real DEFAULT 0,
	"reputation" integer DEFAULT 100,
	"tier" text DEFAULT 'Initiate',
	"is_banned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"power_votes" integer DEFAULT 0,
	"referral_code" text,
	"referred_by" text,
	"referral_earnings" real DEFAULT 0,
	"wallet_address" varchar(42),
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_doc_id" text NOT NULL,
	"category_slug" text NOT NULL,
	"direction" integer NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "market_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_slug" text NOT NULL,
	"total_staked" real DEFAULT 0,
	"item_exposure" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"platform_revenue" real DEFAULT 0,
	CONSTRAINT "market_meta_category_slug_unique" UNIQUE("category_slug")
);
--> statement-breakpoint
CREATE TABLE "stakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_doc_id" text NOT NULL,
	"item_name" text,
	"category_slug" text NOT NULL,
	"amount" real NOT NULL,
	"target" integer NOT NULL,
	"bet_type" text NOT NULL,
	"initial_rank" integer,
	"status" text DEFAULT 'active',
	"epoch_id" integer,
	"implied_probability" real,
	"effective_multiplier" real,
	"multiplier_used" real,
	"slippage_applied" real,
	"payout" real,
	"outcome" text,
	"is_settled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"platform_fee" real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "beta_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"used" boolean DEFAULT false,
	"used_by" varchar(128),
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"is_reusable" boolean DEFAULT false,
	CONSTRAINT "beta_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "vote_packs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"votes" integer NOT NULL,
	"price_ngn" integer NOT NULL,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "sponsored_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" varchar(255) NOT NULL,
	"category_slug" varchar(255) NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"price_ngn" integer NOT NULL,
	"label" varchar(50) DEFAULT 'SPONSORED',
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'general',
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "epoch_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"epoch_id" integer NOT NULL,
	"item_id" text NOT NULL,
	"category_slug" text NOT NULL,
	"rank" integer NOT NULL,
	"score" real NOT NULL,
	"velocity" real DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_revenue" (
	"id" serial PRIMARY KEY NOT NULL,
	"epoch_id" integer NOT NULL,
	"gross_staked_usd" real DEFAULT 0,
	"total_fees_usd" real DEFAULT 0,
	"total_winnings_usd" real DEFAULT 0,
	"net_profit_usd" real DEFAULT 0,
	"recorded_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_revenue_epoch_id_unique" UNIQUE("epoch_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount_ngn" real DEFAULT 0,
	"amount_usd" real DEFAULT 0,
	"platform_fee_usd" real DEFAULT 0,
	"net_amount_usd" real DEFAULT 0,
	"status" text DEFAULT 'pending',
	"reference" text NOT NULL,
	"paystack_ref" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"epoch_id" integer,
	"market_id" text,
	"created_at" timestamp DEFAULT now(),
	"settled_at" timestamp,
	CONSTRAINT "transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE INDEX "items_category_idx" ON "items" USING btree ("category_slug" text_ops);--> statement-breakpoint
CREATE INDEX "votes_user_category_idx" ON "votes" USING btree ("user_id" text_ops,"category_slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "votes_user_item_idx" ON "votes" USING btree ("user_id" text_ops,"item_doc_id" text_ops);--> statement-breakpoint
CREATE INDEX "stakes_user_idx" ON "stakes" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id" text_ops);
*/