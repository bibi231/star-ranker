import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, "..", "serviceAccountKey.json"), "utf-8")
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function testWrite() {
    try {
        await db.collection("categories").doc("test_ping").set({ test: true, ts: Date.now() });
        console.log("SUCCESS: Firestore single write works");
        await db.collection("categories").doc("test_ping").delete();
        console.log("SUCCESS: Cleanup done");
        process.exit(0);
    } catch (e) {
        console.error("FAIL:", e.message);
        console.error("Code:", e.code);
        process.exit(1);
    }
}

testWrite();
