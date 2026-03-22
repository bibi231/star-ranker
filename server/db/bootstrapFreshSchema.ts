/**
 * CREATE TABLE IF NOT EXISTS for all Star Ranker tables.
 * Runs on API boot so a brand-new Neon project works without drizzle-kit push.
 */
import { sql } from "drizzle-orm";
import { formatDbConnectError } from "../lib/formatDbError";
import { db } from "./index";

const statements: string[] = [
    `CREATE TABLE IF NOT EXISTS admin_config (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        killswitch BOOLEAN DEFAULT false,
        epochs_paused BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `INSERT INTO admin_config (key, killswitch, epochs_paused)
     VALUES ('global_state', false, false)
     ON CONFLICT (key) DO NOTHING`,

    `CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        is_frozen BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS market_meta (
        id SERIAL PRIMARY KEY,
        category_slug TEXT NOT NULL UNIQUE,
        total_staked REAL DEFAULT 0,
        platform_revenue REAL DEFAULT 0,
        item_exposure JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS epochs (
        id SERIAL PRIMARY KEY,
        epoch_number INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT false,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        doc_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        symbol TEXT,
        category_slug TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        velocity REAL DEFAULT 0,
        momentum REAL DEFAULT 0,
        volatility REAL DEFAULT 5,
        rank INTEGER DEFAULT 1,
        total_votes INTEGER DEFAULT 0,
        trend JSONB DEFAULT '[]'::jsonb,
        image_url TEXT,
        is_dampened BOOLEAN DEFAULT false,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS items_category_idx ON items (category_slug)`,

    `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid TEXT NOT NULL UNIQUE,
        email TEXT,
        display_name TEXT,
        wallet_address VARCHAR(42) UNIQUE,
        balance REAL DEFAULT 0,
        reputation INTEGER DEFAULT 100,
        tier TEXT DEFAULT 'Initiate',
        power_votes INTEGER DEFAULT 0,
        referral_code TEXT UNIQUE,
        referred_by TEXT,
        oracle_handle VARCHAR(30) UNIQUE,
        oracle_handle_change_count INTEGER DEFAULT 0,
        oracle_handle_change_window_start TIMESTAMP,
        pro_until TIMESTAMP,
        referral_earnings REAL DEFAULT 0,
        is_admin BOOLEAN DEFAULT false,
        is_moderator BOOLEAN DEFAULT false,
        is_banned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_doc_id TEXT NOT NULL,
        category_slug TEXT NOT NULL,
        direction INTEGER NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS votes_user_item_idx ON votes (user_id, item_doc_id)`,
    `CREATE INDEX IF NOT EXISTS votes_user_category_idx ON votes (user_id, category_slug)`,

    `CREATE TABLE IF NOT EXISTS stakes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_doc_id TEXT NOT NULL,
        item_name TEXT,
        category_slug TEXT NOT NULL,
        amount REAL NOT NULL,
        target JSONB NOT NULL,
        bet_type TEXT NOT NULL,
        initial_rank INTEGER,
        status TEXT DEFAULT 'active',
        epoch_id INTEGER,
        implied_probability REAL,
        effective_multiplier REAL,
        multiplier_used REAL,
        slippage_applied REAL,
        payout REAL,
        platform_fee REAL DEFAULT 0,
        outcome TEXT,
        is_settled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS stakes_user_idx ON stakes (user_id)`,

    `CREATE TABLE IF NOT EXISTS epoch_snapshots (
        id SERIAL PRIMARY KEY,
        epoch_id INTEGER NOT NULL,
        item_id TEXT NOT NULL,
        category_slug TEXT NOT NULL,
        rank INTEGER NOT NULL,
        score REAL NOT NULL,
        velocity REAL DEFAULT 0,
        opening_rank INTEGER,
        closing_rank INTEGER,
        rank_change INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS epoch_snapshots_epoch_idx ON epoch_snapshots (epoch_id)`,
    `CREATE INDEX IF NOT EXISTS epoch_snapshots_item_idx ON epoch_snapshots (item_id)`,

    `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount_ngn REAL DEFAULT 0,
        amount_usd REAL DEFAULT 0,
        platform_fee_usd REAL DEFAULT 0,
        net_amount_usd REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        reference TEXT NOT NULL UNIQUE,
        paystack_ref TEXT,
        metadata JSONB DEFAULT '{}',
        epoch_id INTEGER,
        market_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        settled_at TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions (user_id)`,
    `CREATE INDEX IF NOT EXISTS transactions_ref_idx ON transactions (reference)`,

    `CREATE TABLE IF NOT EXISTS platform_revenue (
        id SERIAL PRIMARY KEY,
        epoch_id INTEGER NOT NULL UNIQUE,
        gross_staked_usd REAL DEFAULT 0,
        total_fees_usd REAL DEFAULT 0,
        total_winnings_usd REAL DEFAULT 0,
        net_profit_usd REAL DEFAULT 0,
        recorded_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS market_activity (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        user_id TEXT,
        item_doc_id TEXT,
        item_name TEXT,
        category_slug TEXT,
        amount REAL,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS market_activity_type_idx ON market_activity (type)`,
    `CREATE INDEX IF NOT EXISTS market_activity_created_idx ON market_activity (created_at)`,

    `CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        bank_code VARCHAR(10) NOT NULL,
        account_number VARCHAR(10) NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        paystack_ref VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'general',
        read BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id)`,

    `CREATE TABLE IF NOT EXISTS vote_packs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        votes INTEGER NOT NULL,
        price_ngn INTEGER NOT NULL,
        active BOOLEAN DEFAULT true
    )`,

    `CREATE TABLE IF NOT EXISTS sponsored_items (
        id SERIAL PRIMARY KEY,
        item_id VARCHAR(255) NOT NULL,
        category_slug VARCHAR(255) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        price_ngn INTEGER NOT NULL,
        label VARCHAR(50) DEFAULT 'SPONSORED',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_doc_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS comments_item_idx ON comments (item_doc_id)`,

    // Column added after initial deploys (idempotent)
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
];

export async function bootstrapFreshSchema(): Promise<void> {
    for (let i = 0; i < statements.length; i++) {
        try {
            await db.execute(sql.raw(statements[i]));
        } catch (e: unknown) {
            console.warn(
                `[schema] bootstrap stmt ${i + 1}/${statements.length} failed:`,
                formatDbConnectError(e)
            );
        }
    }
    console.log("[schema] bootstrapFreshSchema complete");
}
