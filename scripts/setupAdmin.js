/**
 * Star Ranker: Admin Setup Script
 * 
 * Sets up an admin user with Firebase Custom Claims.
 * Run this after creating the admin account in Firebase Auth.
 * 
 * Usage: 
 *   node scripts/setupAdmin.js <admin-email>
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

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function setupAdmin(email) {
    console.log(`\n🔐 Setting up admin for: ${email}\n`);

    try {
        // 1. Get user by email
        const user = await auth.getUserByEmail(email);
        console.log(`✅ Found user: ${user.uid}`);

        // 2. Set admin custom claim
        await auth.setCustomUserClaims(user.uid, { admin: true });
        console.log('✅ Set admin:true custom claim');

        // 3. Create/Update user document in Firestore
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            displayName: user.displayName || email.split('@')[0],
            tier: 'Oracle',
            reputation: 10000,
            balance: 100000,
            isAdmin: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('✅ Created/updated user document with Oracle tier');

        // 4. Verify the setup
        const updatedUser = await auth.getUser(user.uid);
        console.log('\n📋 Admin Setup Complete:');
        console.log(`   UID: ${updatedUser.uid}`);
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Custom Claims: ${JSON.stringify(updatedUser.customClaims)}`);

        console.log('\n⚠️  IMPORTANT: Sign out and sign back in for claims to take effect.\n');

    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error(`❌ User not found: ${email}`);
            console.error('   Create the account first via the sign-up page.');
        } else {
            console.error('❌ Error:', error.message);
        }
        process.exit(1);
    }

    process.exit(0);
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.log('Usage: node scripts/setupAdmin.js <admin-email>');
    console.log('Example: node scripts/setupAdmin.js admin@star-ranker.com');
    process.exit(1);
}

setupAdmin(email);
