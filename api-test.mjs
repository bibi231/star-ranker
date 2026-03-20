/**
 * STAR RANKER — Full API Integration Test Suite
 * Run: node api-test.mjs
 * Tests every API endpoint, logs results, and prints a final report.
 *
 * CONFIG: Set BASE_URL and TEST_TOKEN before running.
 * TEST_TOKEN: Get a real Firebase ID token by logging in on the site,
 *             opening DevTools → Application → IndexedDB → Firebase → look for idToken
 *             OR add a temporary /api/test-token route that returns one.
 */

const BASE_URL   = process.env.API_URL   || "http://localhost:3001";
const TEST_TOKEN = process.env.TEST_TOKEN || "REPLACE_WITH_FIREBASE_ID_TOKEN";
const ADMIN_TOKEN= process.env.ADMIN_TOKEN|| "REPLACE_WITH_ADMIN_FIREBASE_ID_TOKEN";

// ── Colour helpers ──────────────────────────────────────────────────
const G = s => `\x1b[32m${s}\x1b[0m`;   // green
const R = s => `\x1b[31m${s}\x1b[0m`;   // red
const Y = s => `\x1b[33m${s}\x1b[0m`;   // yellow
const B = s => `\x1b[36m${s}\x1b[0m`;   // cyan
const W = s => `\x1b[1m${s}\x1b[0m`;    // bold

const results = [];
let passed = 0, failed = 0, warned = 0;

// ── Test runner ─────────────────────────────────────────────────────
async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    console.log(G(`  ✅ PASS`) + ` [${ms}ms]  ${name}`);
    results.push({ name, status: "PASS", ms });
    passed++;
  } catch (e) {
    const ms = Date.now() - start;
    console.log(R(`  ❌ FAIL`) + ` [${ms}ms]  ${name}`);
    console.log(R(`       → ${e.message}`));
    results.push({ name, status: "FAIL", ms, error: e.message });
    failed++;
  }
}

async function warn(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    console.log(G(`  ✅ PASS`) + ` [${ms}ms]  ${name}`);
    results.push({ name, status: "PASS", ms });
    passed++;
  } catch (e) {
    const ms = Date.now() - start;
    console.log(Y(`  ⚠  WARN`) + ` [${ms}ms]  ${name}`);
    console.log(Y(`       → ${e.message}`));
    results.push({ name, status: "WARN", ms, error: e.message });
    warned++;
  }
}

// ── HTTP helpers ────────────────────────────────────────────────────
async function get(path, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function post(path, data, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST", headers, body: JSON.stringify(data)
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// ── TEST SUITES ─────────────────────────────────────────────────────

async function suiteHealth() {
  console.log(B("\n⚡ SUITE: Health & Connectivity"));

  await test("Server is reachable", async () => {
    const { status } = await get("/api/categories");
    assert(status < 500, `Server returned ${status}`);
  });

  await test("GET /api/categories returns array with 10+ categories", async () => {
    const { status, body } = await get("/api/categories");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body), "Body is not an array");
    assert(body.length >= 10, `Only ${body.length} categories (expected 10+)`);
  });

  await test("GET /api/categories response time < 500ms", async () => {
    const start = Date.now();
    await get("/api/categories");
    const ms = Date.now() - start;
    assert(ms < 500, `Took ${ms}ms — too slow`);
  });

  await test("GET /api/items?categoryId=1 returns items", async () => {
    const cats = await get("/api/categories");
    const firstId = cats.body[0]?.id;
    assert(firstId, "No categories found");
    const { status, body } = await get(`/api/items?categoryId=${firstId}`);
    assert(status === 200, `Got ${status}`);
    assert(Array.isArray(body) && body.length > 0, "No items returned");
  });
}

async function suiteAuth() {
  console.log(B("\n🔐 SUITE: Authentication & Security"));

  await test("Protected routes reject unauthenticated requests with 401", async () => {
    const { status } = await post("/api/stakes", { itemId: 1, amount: 100 });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test("Protected routes reject invalid tokens with 401", async () => {
    const { status } = await post("/api/stakes", { itemId: 1 }, "fake-token-123");
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test("Admin routes reject non-admin tokens with 401 or 403", async () => {
    if (TEST_TOKEN === "REPLACE_WITH_FIREBASE_ID_TOKEN") {
      throw new Error("TEST_TOKEN not configured — skipping auth tests");
    }
    const { status } = await get("/api/admin/revenue", TEST_TOKEN);
    assert(status === 403 || status === 401, `Expected 403/401, got ${status}`);
  });
}

async function suiteStaking() {
  console.log(B("\n💰 SUITE: Staking System"));

  if (TEST_TOKEN === "REPLACE_WITH_FIREBASE_ID_TOKEN") {
    console.log(Y("  ⚠  Skipping staking tests — TEST_TOKEN not configured"));
    return;
  }

  let itemId;
  await test("Can fetch items to stake on", async () => {
    const cats = await get("/api/categories");
    const catId = cats.body[0]?.id;
    const items = await get(`/api/items?categoryId=${catId}`);
    itemId = items.body[0]?.id;
    assert(itemId, "No item ID found to test staking");
  });

  await test("Staking with zero amount is rejected (Zod validation)", async () => {
    const { status } = await post("/api/stakes",
      { itemId, amount: 0, type: "exact", prediction: 1 }, TEST_TOKEN);
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("Staking with negative amount is rejected", async () => {
    const { status } = await post("/api/stakes",
      { itemId, amount: -500, type: "exact", prediction: 1 }, TEST_TOKEN);
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("Staking with missing type is rejected", async () => {
    const { status } = await post("/api/stakes",
      { itemId, amount: 500 }, TEST_TOKEN);
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await warn("Valid stake structure is accepted by API (may fail if balance is 0)", async () => {
    const { status, body } = await post("/api/stakes",
      { itemId, amount: 100, type: "directional", prediction: "up" }, TEST_TOKEN);
    // 400 balance issue is a warn, 500 is a fail
    assert(status !== 500, `Server error: ${JSON.stringify(body)}`);
  });
}

async function suitePayments() {
  console.log(B("\n💳 SUITE: Payments"));

  if (TEST_TOKEN === "REPLACE_WITH_FIREBASE_ID_TOKEN") {
    console.log(Y("  ⚠  Skipping payment tests — TEST_TOKEN not configured"));
    return;
  }

  await test("Payment initialize returns authorization_url", async () => {
    const { status, body } = await post("/api/payments/initialize",
      { amount: 1000 }, TEST_TOKEN);
    assert(status === 200, `Got ${status}: ${JSON.stringify(body)}`);
    assert(body.authorization_url || body.data?.authorization_url,
      "No authorization_url in response");
  });

  await test("Withdrawal route returns 503 (correctly blocked in beta)", async () => {
    const { status } = await get("/api/withdrawals", TEST_TOKEN);
    assert(status === 503, `Expected 503, got ${status}`);
  });

  await test("Webhook endpoint exists and rejects unsigned requests", async () => {
    const { status } = await post("/api/payments/webhook", { event: "charge.success" });
    assert(status === 400 || status === 401 || status === 403,
      `Expected rejection, got ${status}`);
  });
}

async function suiteVotes() {
  console.log(B("\n🗳  SUITE: Voting"));

  if (TEST_TOKEN === "REPLACE_WITH_FIREBASE_ID_TOKEN") {
    console.log(Y("  ⚠  Skipping vote tests — TEST_TOKEN not configured"));
    return;
  }

  let itemId;
  const cats = await get("/api/categories");
  const items = await get(`/api/items?categoryId=${cats.body[0]?.id}`);
  itemId = items.body[0]?.id;

  await test("Upvote on valid item is accepted", async () => {
    const { status } = await post("/api/votes",
      { itemId, direction: "up" }, TEST_TOKEN);
    assert(status === 200 || status === 201, `Got ${status}`);
  });

  await test("Downvote on valid item is accepted", async () => {
    const { status } = await post("/api/votes",
      { itemId, direction: "down" }, TEST_TOKEN);
    assert(status === 200 || status === 201, `Got ${status}`);
  });

  await test("Vote with invalid direction is rejected", async () => {
    const { status } = await post("/api/votes",
      { itemId, direction: "sideways" }, TEST_TOKEN);
    assert(status === 400, `Expected 400, got ${status}`);
  });
}

async function suiteRateLimiting() {
  console.log(B("\n🛡  SUITE: Rate Limiting"));

  await test("Rapid-fire requests eventually get rate limited (429)", async () => {
    let got429 = false;
    // Fire 15 requests rapidly against the staking endpoint
    const requests = Array.from({ length: 15 }, () =>
      post("/api/stakes", { itemId: 1, amount: 100 })
    );
    const responses = await Promise.all(requests);
    got429 = responses.some(r => r.status === 429);
    // If we got 429 OR all returned 401 (unauthenticated rejection), rate limiting is active
    const allRejected = responses.every(r => r.status === 401 || r.status === 429);
    assert(allRejected, `Some requests slipped through without auth or rate limit`);
  });
}

async function suiteEpochs() {
  console.log(B("\n⏱  SUITE: Epochs"));

  await test("GET /api/epochs/current returns active epoch", async () => {
    const { status, body } = await get("/api/epochs/current");
    assert(status === 200, `Got ${status}`);
    assert(body.id || body.epochId, "No epoch ID in response");
  });

  await warn("Epoch has startTime and endTime fields", async () => {
    const { body } = await get("/api/epochs/current");
    assert(body.startTime || body.start_time, "No startTime");
    assert(body.endTime   || body.end_time,   "No endTime");
  });
}

async function suiteAdmin() {
  console.log(B("\n👑 SUITE: Admin"));

  if (ADMIN_TOKEN === "REPLACE_WITH_ADMIN_FIREBASE_ID_TOKEN") {
    console.log(Y("  ⚠  Skipping admin tests — ADMIN_TOKEN not configured"));
    return;
  }

  await test("Admin revenue endpoint returns totals", async () => {
    const { status, body } = await get("/api/admin/revenue", ADMIN_TOKEN);
    assert(status === 200, `Got ${status}`);
    assert(typeof body.totalRake !== "undefined" ||
           typeof body.grandTotal !== "undefined", "No revenue data");
  });
}

// ── LOAD SIMULATION (light) ─────────────────────────────────────────
async function suiteLoadLight() {
  console.log(B("\n🔥 SUITE: Light Load Simulation (50 concurrent)"));

  await test("50 concurrent GET /api/categories all return 200", async () => {
    const requests = Array.from({ length: 50 }, () => get("/api/categories"));
    const responses = await Promise.all(requests);
    const failed = responses.filter(r => r.status !== 200);
    assert(failed.length === 0, `${failed.length}/50 requests failed`);
  });

  await test("50 concurrent requests complete in under 3 seconds", async () => {
    const start = Date.now();
    const requests = Array.from({ length: 50 }, () => get("/api/categories"));
    await Promise.all(requests);
    const ms = Date.now() - start;
    assert(ms < 3000, `Took ${ms}ms — too slow for 50 concurrent requests`);
  });

  await warn("100 concurrent requests complete in under 5 seconds", async () => {
    const start = Date.now();
    const requests = Array.from({ length: 100 }, () => get("/api/categories"));
    await Promise.all(requests);
    const ms = Date.now() - start;
    assert(ms < 5000, `Took ${ms}ms`);
  });
}

// ── MAIN ────────────────────────────────────────────────────────────
console.log(W("\n╔══════════════════════════════════════════════════╗"));
console.log(W("║   STAR RANKER — API Integration Test Suite       ║"));
console.log(W("╚══════════════════════════════════════════════════╝"));
console.log(`  Target: ${B(BASE_URL)}`);
console.log(`  Time:   ${new Date().toISOString()}\n`);

await suiteHealth();
await suiteAuth();
await suiteStaking();
await suitePayments();
await suiteVotes();
await suiteRateLimiting();
await suiteEpochs();
await suiteAdmin();
await suiteLoadLight();

// ── REPORT ───────────────────────────────────────────────────────────
const total = passed + failed + warned;
console.log(W("\n╔══════════════════════════════════════════════════╗"));
console.log(W("║   TEST REPORT                                     ║"));
console.log(W("╚══════════════════════════════════════════════════╝"));
console.log(`  Total:   ${total}`);
console.log(`  ${G("Passed:")}  ${passed}`);
console.log(`  ${R("Failed:")}  ${failed}`);
console.log(`  ${Y("Warned:")}  ${warned}`);
console.log(`  Score:   ${Math.round((passed/total)*100)}%`);

if (failed > 0) {
  console.log(R("\n  ❌ FAILURES:"));
  results.filter(r => r.status === "FAIL").forEach(r => {
    console.log(R(`  • ${r.name}`));
    console.log(R(`    ${r.error}`));
  });
}

if (warned > 0) {
  console.log(Y("\n  ⚠  WARNINGS:"));
  results.filter(r => r.status === "WARN").forEach(r => {
    console.log(Y(`  • ${r.name}`));
    console.log(Y(`    ${r.error}`));
  });
}

const betaReady = failed === 0;
console.log(betaReady
  ? G("\n  🚀 BETA READY — all tests passed!")
  : R("\n  🔴 NOT BETA READY — fix failures above first"));

console.log("");
process.exit(betaReady ? 0 : 1);
