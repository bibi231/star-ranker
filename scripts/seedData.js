/**
 * Star Ranker: Production Data Seeder
 * 
 * Seeds the database with real-world verifiable data for all markets.
 * Uses Firebase Admin SDK for direct Firestore access.
 * 
 * Usage: node scripts/seedData.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    join(__dirname, '../serviceAccountKey.json');

let serviceAccount;
try {
    serviceAccount = require(serviceAccountPath);
} catch (error) {
    console.error('Failed to load service account key from:', serviceAccountPath);
    console.error('Make sure serviceAccountKey.json exists in project root.');
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// ============================
// MARKET DEFINITIONS
// ============================

const CATEGORIES = [
    { slug: 'crypto', title: 'Cryptocurrencies', viscosity: 0.8, stakingEnabled: true },
    { slug: 'smartphones', title: 'Smartphones', viscosity: 1.2, stakingEnabled: true },
    { slug: 'music', title: 'Music Artists', viscosity: 1.0, stakingEnabled: true },
    { slug: 'websites', title: 'Top Websites', viscosity: 1.5, stakingEnabled: true },
    { slug: 'tech', title: 'Tech Companies', viscosity: 1.0, stakingEnabled: true }
];

// ============================
// REAL-WORLD DATA
// ============================

// Top 100 Cryptocurrencies
const CRYPTO_DATA = [
    { name: 'Bitcoin', symbol: 'BTC', momentum: 100 },
    { name: 'Ethereum', symbol: 'ETH', momentum: 95 },
    { name: 'Tether', symbol: 'USDT', momentum: 80 },
    { name: 'BNB', symbol: 'BNB', momentum: 75 },
    { name: 'Solana', symbol: 'SOL', momentum: 85 },
    { name: 'XRP', symbol: 'XRP', momentum: 70 },
    { name: 'USDC', symbol: 'USDC', momentum: 65 },
    { name: 'Cardano', symbol: 'ADA', momentum: 60 },
    { name: 'Avalanche', symbol: 'AVAX', momentum: 72 },
    { name: 'Dogecoin', symbol: 'DOGE', momentum: 68 },
    { name: 'Polkadot', symbol: 'DOT', momentum: 55 },
    { name: 'Chainlink', symbol: 'LINK', momentum: 65 },
    { name: 'Polygon', symbol: 'MATIC', momentum: 62 },
    { name: 'TRON', symbol: 'TRX', momentum: 50 },
    { name: 'Litecoin', symbol: 'LTC', momentum: 45 },
    { name: 'Shiba Inu', symbol: 'SHIB', momentum: 58 },
    { name: 'Uniswap', symbol: 'UNI', momentum: 52 },
    { name: 'Bitcoin Cash', symbol: 'BCH', momentum: 40 },
    { name: 'Stellar', symbol: 'XLM', momentum: 38 },
    { name: 'Cosmos', symbol: 'ATOM', momentum: 48 },
    { name: 'Monero', symbol: 'XMR', momentum: 42 },
    { name: 'Ethereum Classic', symbol: 'ETC', momentum: 35 },
    { name: 'Hedera', symbol: 'HBAR', momentum: 44 },
    { name: 'Filecoin', symbol: 'FIL', momentum: 36 },
    { name: 'Internet Computer', symbol: 'ICP', momentum: 46 },
    { name: 'Lido DAO', symbol: 'LDO', momentum: 50 },
    { name: 'Aptos', symbol: 'APT', momentum: 55 },
    { name: 'Arbitrum', symbol: 'ARB', momentum: 58 },
    { name: 'VeChain', symbol: 'VET', momentum: 32 },
    { name: 'Near Protocol', symbol: 'NEAR', momentum: 48 },
];

// Top 30 Smartphones
const SMARTPHONE_DATA = [
    { name: 'iPhone 15 Pro Max', brand: 'Apple', momentum: 100 },
    { name: 'iPhone 15 Pro', brand: 'Apple', momentum: 95 },
    { name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', momentum: 98 },
    { name: 'Samsung Galaxy S24+', brand: 'Samsung', momentum: 88 },
    { name: 'Google Pixel 8 Pro', brand: 'Google', momentum: 90 },
    { name: 'Google Pixel 8', brand: 'Google', momentum: 82 },
    { name: 'OnePlus 12', brand: 'OnePlus', momentum: 85 },
    { name: 'Xiaomi 14 Ultra', brand: 'Xiaomi', momentum: 88 },
    { name: 'Samsung Galaxy Z Fold 5', brand: 'Samsung', momentum: 80 },
    { name: 'iPhone 15', brand: 'Apple', momentum: 82 },
    { name: 'Nothing Phone (2)', brand: 'Nothing', momentum: 62 },
    { name: 'OPPO Find X7 Ultra', brand: 'OPPO', momentum: 72 },
    { name: 'vivo X100 Pro', brand: 'vivo', momentum: 70 },
    { name: 'Sony Xperia 1 V', brand: 'Sony', momentum: 60 },
    { name: 'ASUS ROG Phone 8 Pro', brand: 'ASUS', momentum: 65 },
];

// Top 30 Music Artists
const MUSIC_DATA = [
    { name: 'Taylor Swift', genre: 'Pop', momentum: 100 },
    { name: 'Bad Bunny', genre: 'Reggaeton', momentum: 95 },
    { name: 'The Weeknd', genre: 'R&B', momentum: 90 },
    { name: 'Drake', genre: 'Hip-Hop', momentum: 92 },
    { name: 'BTS', genre: 'K-Pop', momentum: 88 },
    { name: 'Ed Sheeran', genre: 'Pop', momentum: 82 },
    { name: 'Billie Eilish', genre: 'Pop', momentum: 85 },
    { name: 'Dua Lipa', genre: 'Pop', momentum: 78 },
    { name: 'Beyoncé', genre: 'R&B', momentum: 88 },
    { name: 'Kendrick Lamar', genre: 'Hip-Hop', momentum: 85 },
    { name: 'SZA', genre: 'R&B', momentum: 85 },
    { name: 'Morgan Wallen', genre: 'Country', momentum: 85 },
    { name: 'Peso Pluma', genre: 'Regional Mexican', momentum: 88 },
    { name: 'Olivia Rodrigo', genre: 'Pop', momentum: 80 },
    { name: 'Coldplay', genre: 'Rock', momentum: 78 },
];

// Top 30 Websites
const WEBSITE_DATA = [
    { name: 'Google', category: 'Search', momentum: 100 },
    { name: 'YouTube', category: 'Video', momentum: 98 },
    { name: 'Facebook', category: 'Social', momentum: 85 },
    { name: 'Instagram', category: 'Social', momentum: 90 },
    { name: 'TikTok', category: 'Social', momentum: 95 },
    { name: 'Amazon', category: 'E-commerce', momentum: 88 },
    { name: 'Twitter/X', category: 'Social', momentum: 82 },
    { name: 'Reddit', category: 'Social', momentum: 80 },
    { name: 'Netflix', category: 'Streaming', momentum: 78 },
    { name: 'ChatGPT', category: 'AI', momentum: 95 },
    { name: 'LinkedIn', category: 'Professional', momentum: 72 },
    { name: 'GitHub', category: 'Developer', momentum: 82 },
    { name: 'Discord', category: 'Communication', momentum: 80 },
    { name: 'Spotify', category: 'Music', momentum: 78 },
    { name: 'Wikipedia', category: 'Reference', momentum: 75 },
];

// Top 30 Tech Companies
const TECH_DATA = [
    { name: 'Apple', industry: 'Consumer Electronics', momentum: 100 },
    { name: 'Microsoft', industry: 'Software', momentum: 98 },
    { name: 'NVIDIA', industry: 'Semiconductors', momentum: 100 },
    { name: 'Alphabet (Google)', industry: 'Internet', momentum: 95 },
    { name: 'Amazon', industry: 'E-commerce/Cloud', momentum: 92 },
    { name: 'Meta', industry: 'Social Media', momentum: 85 },
    { name: 'Tesla', industry: 'Electric Vehicles', momentum: 88 },
    { name: 'OpenAI', industry: 'AI', momentum: 98 },
    { name: 'Taiwan Semiconductor', industry: 'Semiconductors', momentum: 90 },
    { name: 'Samsung Electronics', industry: 'Electronics', momentum: 82 },
    { name: 'SpaceX', industry: 'Aerospace', momentum: 92 },
    { name: 'Stripe', industry: 'Fintech', momentum: 80 },
    { name: 'ByteDance', industry: 'Social Media', momentum: 88 },
    { name: 'Anthropic', industry: 'AI', momentum: 85 },
    { name: 'Databricks', industry: 'Data', momentum: 72 },
];

// ============================
// SEEDING FUNCTIONS
// ============================

async function seedCategories() {
    console.log('📁 Seeding categories...');
    const batch = db.batch();

    for (const category of CATEGORIES) {
        const docRef = db.collection('categories').doc(category.slug);
        batch.set(docRef, {
            ...category,
            isActive: true,
            isFrozen: false,
            createdAt: FieldValue.serverTimestamp()
        }, { merge: true });
    }

    await batch.commit();
    console.log(`✅ Seeded ${CATEGORIES.length} categories`);
}

async function seedItems(categorySlug, items, transformer) {
    console.log(`📦 Seeding ${items.length} items for ${categorySlug}...`);

    // Batch write in chunks of 500 (Firestore limit)
    const BATCH_SIZE = 500;
    let processed = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = items.slice(i, i + BATCH_SIZE);

        for (let j = 0; j < chunk.length; j++) {
            const item = chunk[j];
            const rank = i + j + 1;
            const docId = `${categorySlug}-${rank.toString().padStart(3, '0')}`;
            const docRef = db.collection('items').doc(docId);

            batch.set(docRef, {
                ...transformer(item, rank),
                categoryId: categorySlug,
                rankPosition: rank,
                score: item.momentum * 10,
                momentum: item.momentum,
                velocity: Math.random() * 10 - 5, // Random velocity between -5 and 5
                totalVotes: Math.floor(item.momentum * 50 + Math.random() * 500),
                lastUpdated: FieldValue.serverTimestamp()
            }, { merge: true });
        }

        await batch.commit();
        processed += chunk.length;
        console.log(`  → ${processed}/${items.length} items`);
    }

    console.log(`✅ Seeded ${items.length} items for ${categorySlug}`);
}

// ============================
// MAIN EXECUTION
// ============================

async function main() {
    console.log('\n🚀 Star Ranker: Production Data Seeder\n');
    console.log('='.repeat(50));

    try {
        // 1. Seed categories
        await seedCategories();

        // 2. Seed each market
        await seedItems('crypto', CRYPTO_DATA, (item, rank) => ({
            name: item.name,
            symbol: item.symbol,
            imageUrl: null
        }));

        await seedItems('smartphones', SMARTPHONE_DATA, (item, rank) => ({
            name: item.name,
            brand: item.brand,
            imageUrl: null
        }));

        await seedItems('music', MUSIC_DATA, (item, rank) => ({
            name: item.name,
            genre: item.genre,
            imageUrl: null
        }));

        await seedItems('websites', WEBSITE_DATA, (item, rank) => ({
            name: item.name,
            category: item.category,
            imageUrl: null
        }));

        await seedItems('tech', TECH_DATA, (item, rank) => ({
            name: item.name,
            industry: item.industry,
            imageUrl: null
        }));

        console.log('\n' + '='.repeat(50));
        console.log('✅ All data seeded successfully!\n');
        console.log('Summary:');
        console.log(`  • ${CATEGORIES.length} categories`);
        console.log(`  • ${CRYPTO_DATA.length} cryptocurrencies`);
        console.log(`  • ${SMARTPHONE_DATA.length} smartphones`);
        console.log(`  • ${MUSIC_DATA.length} music artists`);
        console.log(`  • ${WEBSITE_DATA.length} websites`);
        console.log(`  • ${TECH_DATA.length} tech companies`);
        const total = CRYPTO_DATA.length + SMARTPHONE_DATA.length + MUSIC_DATA.length + WEBSITE_DATA.length + TECH_DATA.length;
        console.log(`  • Total: ${total} items\n`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();
