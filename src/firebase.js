// src/firebase.js
// Firebase Auth only — data layer handled by Express API + Neon Postgres

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Debug: Validate config presence
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("\"")) {
  console.error("❌ Firebase API Key is missing or incorrectly quoted in .env");
}

if (firebaseConfig.projectId !== "star-ranker") {
  console.warn(`⚠️ Project ID mismatch: Expected star-ranker, got ${firebaseConfig.projectId}`);
}

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Analytics only runs in the browser environment
let analytics = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics not initialized:", e.message);
  }
}

export const firebaseApp = app;
export const analyticsInstance = analytics;
export const auth = getAuth(app);
