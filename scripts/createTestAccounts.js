/**
 * Star Ranker: Create Test Accounts
 * 
 * Creates two test accounts for beta testing:
 * 1. Regular user (tester@star-ranker.com)
 * 2. Admin user (admin@star-ranker.com)
 * 
 * Usage: node scripts/createTestAccounts.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, '../serviceAccountKey.json');

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
const auth = getAuth();

// Test account credentials
const TEST_ACCOUNTS = [
    {
        email: 'tester@star-ranker.com',
        password: 'TestUser123!',
        displayName: 'Test User',
        tier: 'Initiate',
        isAdmin: false
    },
    {
        email: 'admin@star-ranker.com',
        password: 'AdminUser123!',
        displayName: 'Admin User',
        tier: 'Oracle',
        isAdmin: true
    }
];

async function createAccount(account) {
    console.log(`\n📝 Creating account: ${account.email}`);

    try {
        // Check if user already exists
        try {
            const existingUser = await auth.getUserByEmail(account.email);
            console.log(`   ⚠️  User already exists: ${existingUser.uid}`);

            // Update existing user
            await auth.updateUser(existingUser.uid, {
                displayName: account.displayName,
                emailVerified: true
            });

            // Set custom claims if admin
            if (account.isAdmin) {
                await auth.setCustomUserClaims(existingUser.uid, { admin: true });
            }

            // Update Firestore document
            await db.collection('users').doc(existingUser.uid).set({
                email: account.email,
                displayName: account.displayName,
                tier: account.tier,
                reputation: account.isAdmin ? 10000 : 100,
                balance: account.isAdmin ? 100000 : 1000,
                isAdmin: account.isAdmin,
                emailVerified: true,
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`   ✅ Updated existing account`);
            return existingUser.uid;

        } catch (e) {
            if (e.code !== 'auth/user-not-found') throw e;
        }

        // Create new user
        const userRecord = await auth.createUser({
            email: account.email,
            password: account.password,
            displayName: account.displayName,
            emailVerified: true
        });

        console.log(`   ✅ Created user: ${userRecord.uid}`);

        // Set custom claims if admin
        if (account.isAdmin) {
            await auth.setCustomUserClaims(userRecord.uid, { admin: true });
            console.log(`   ✅ Set admin:true custom claim`);
        }

        // Create Firestore document
        await db.collection('users').doc(userRecord.uid).set({
            email: account.email,
            displayName: account.displayName,
            tier: account.tier,
            reputation: account.isAdmin ? 10000 : 100,
            balance: account.isAdmin ? 100000 : 1000,
            isAdmin: account.isAdmin,
            emailVerified: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        console.log(`   ✅ Created Firestore document`);

        return userRecord.uid;

    } catch (error) {
        console.error(`   ❌ Failed to create ${account.email}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('\n🚀 Star Ranker: Creating Test Accounts\n');
    console.log('='.repeat(50));

    for (const account of TEST_ACCOUNTS) {
        await createAccount(account);
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Test accounts ready!\n');
    console.log('📋 Login Credentials:');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ REGULAR USER                                        │');
    console.log('│   Email:    tester@star-ranker.com                  │');
    console.log('│   Password: TestUser123!                            │');
    console.log('│   Tier:     Initiate                                │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│ ADMIN USER                                          │');
    console.log('│   Email:    admin@star-ranker.com                   │');
    console.log('│   Password: AdminUser123!                           │');
    console.log('│   Tier:     Oracle (full admin access)              │');
    console.log('└─────────────────────────────────────────────────────┘');
    console.log('');

    process.exit(0);
}

main();
