#!/usr/bin/env node
/**
 * STAR RANKER — Test Runner
 * Runs all test suites in sequence and prints a combined report.
 *
 * Usage:
 *   node run-tests.mjs                         (test localhost)
 *   API_URL=https://your-api.onrender.com \
 *   SITE_URL=https://your-site.vercel.app \
 *   node run-tests.mjs                         (test production)
 */

import { execSync, spawn } from "child_process";
import { existsSync } from "fs";

const API_URL  = process.env.API_URL  || "http://localhost:3001";
const SITE_URL = process.env.SITE_URL || "http://localhost:5173";

const W = s => `\x1b[1m${s}\x1b[0m`;
const G = s => `\x1b[32m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const B = s => `\x1b[36m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;

console.log(W(`
╔══════════════════════════════════════════════════════╗
║        STAR RANKER — FULL TEST SUITE RUNNER          ║
╚══════════════════════════════════════════════════════╝
`));
console.log(`  API target:  ${B(API_URL)}`);
console.log(`  Site target: ${B(SITE_URL)}`);
console.log(`  Time:        ${new Date().toISOString()}\n`);

const results = [];

// ── Step 1: API Integration Tests ──────────────────────────────────
console.log(W("═══ STEP 1: API Integration Tests ═══"));
try {
  execSync(`API_URL=${API_URL} node api-test.mjs`, {
    stdio: "inherit",
    env: { ...process.env, API_URL, TEST_TOKEN: process.env.TEST_TOKEN || "" }
  });
  results.push({ name: "API Integration Tests", status: "PASS" });
} catch (e) {
  results.push({ name: "API Integration Tests", status: "FAIL" });
}

// ── Step 2: UX / E2E Tests ──────────────────────────────────────────
console.log(W("\n═══ STEP 2: E2E UX Tests (Playwright) ═══"));
const playwrightInstalled = (() => {
  try { execSync("npx playwright --version", { stdio: "pipe" }); return true; }
  catch { return false; }
})();

if (!playwrightInstalled) {
  console.log(Y("  ⚠  Playwright not installed. Run: npm install -D @playwright/test && npx playwright install chromium"));
  results.push({ name: "E2E UX Tests", status: "SKIP — install playwright first" });
} else {
  try {
    execSync(
      `SITE_URL=${SITE_URL} npx playwright test ux-test.spec.js --reporter=list`,
      { stdio: "inherit", env: { ...process.env, SITE_URL } }
    );
    results.push({ name: "E2E UX Tests", status: "PASS" });
  } catch (e) {
    results.push({ name: "E2E UX Tests", status: "FAIL" });
  }
}

// ── Step 3: Load Test ───────────────────────────────────────────────
console.log(W("\n═══ STEP 3: Load Test (k6 — 500 users) ═══"));
const k6Installed = (() => {
  try { execSync("k6 version", { stdio: "pipe" }); return true; }
  catch { return false; }
})();

if (!k6Installed) {
  console.log(Y("  ⚠  k6 not installed."));
  console.log(Y("      macOS:   brew install k6"));
  console.log(Y("      Windows: choco install k6"));
  console.log(Y("      Linux:   sudo apt install k6"));
  results.push({ name: "Load Test (500 users)", status: "SKIP — install k6 first" });
} else {
  try {
    execSync(`k6 run --env TARGET=${API_URL} load-test.js`, {
      stdio: "inherit",
      env: { ...process.env }
    });
    results.push({ name: "Load Test (500 users)", status: "PASS" });
  } catch (e) {
    results.push({ name: "Load Test (500 users)", status: "FAIL" });
  }
}

// ── Final Report ────────────────────────────────────────────────────
console.log(W(`
╔══════════════════════════════════════════════════════╗
║           FINAL TEST SUITE REPORT                    ║
╚══════════════════════════════════════════════════════╝
`));

results.forEach(r => {
  const icon = r.status === "PASS" ? G("✅ PASS") :
               r.status === "FAIL" ? R("❌ FAIL") : Y("⏭  SKIP");
  console.log(`  ${icon}  ${r.name}`);
  if (r.status !== "PASS") console.log(`         → ${r.status}`);
});

const allPassed = results.every(r => r.status === "PASS");
console.log(allPassed
  ? G("\n  🚀 ALL TESTS PASSED — STAR RANKER IS BETA READY FOR 500 USERS\n")
  : R("\n  🔴 SOME TESTS FAILED — Review failures above before inviting testers\n")
);
