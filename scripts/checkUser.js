import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = join(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function checkUser(email) {
    try {
        const user = await auth.getUserByEmail(email);
        console.log(`\n👤 User: ${email}`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Claims: ${JSON.stringify(user.customClaims)}`);

        const docRef = db.collection('users').doc(user.uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            console.log(`   Firestore Doc: ${JSON.stringify(docSnap.data(), null, 2)}`);
        } else {
            console.log(`   ❌ Firestore document NOT FOUND for UID: ${user.uid}`);
        }
    } catch (error) {
        console.error(`Error checking user ${email}:`, error.message);
    }
    process.exit(0);
}

checkUser('peterjohn2343@gmail.com');
