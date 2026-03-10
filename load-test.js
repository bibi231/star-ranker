/**
 * STAR RANKER — k6 Load Test
 * Tests the platform at 500 concurrent users.
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 *   macOS:   brew install k6
 *   Windows: choco install k6
 *   Linux:   sudo apt install k6
 *
 * Run:
 *   k6 run load-test.js                          (quick smoke test)
 *   k6 run --env TARGET=https://your-api.onrender.com load-test.js  (production)
 *
 * Thresholds — the test FAILS if:
 *   • More than 1% of requests fail
 *   • 95th percentile response time > 2 seconds
 *   • 99th percentile response time > 5 seconds
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ── Config ──────────────────────────────────────────────────────────
const BASE = __ENV.TARGET || "http://localhost:3001";

// ── Custom metrics ──────────────────────────────────────────────────
const stakeErrors    = new Counter("stake_errors");
const categoryErrors = new Counter("category_errors");
const errorRate      = new Rate("error_rate");
const categoryTrend  = new Trend("category_response_ms");
const stakeTrend     = new Trend("stake_response_ms");

// ── Load stages ─────────────────────────────────────────────────────
// Ramp up → hold at 500 → ramp down
// This mimics a real beta launch where users pile in
export const options = {
  stages: [
    { duration: "30s", target: 50  },  // Warm up
    { duration: "1m",  target: 200 },  // Build up
    { duration: "2m",  target: 500 },  // Peak load — 500 concurrent users
    { duration: "1m",  target: 500 },  // Hold at peak
    { duration: "30s", target: 0   },  // Cool down
  ],
  thresholds: {
    http_req_failed:   ["rate<0.01"],      // < 1% failure rate
    http_req_duration: ["p(95)<2000"],     // 95% of requests under 2s
    http_req_duration: ["p(99)<5000"],     // 99% under 5s
    error_rate:        ["rate<0.01"],
  },
};

// ── Simulated user behaviour ─────────────────────────────────────────
export default function () {
  const headers = { "Content-Type": "application/json" };

  // 1. Load categories (every user does this on arrival)
  const catRes = http.get(`${BASE}/api/categories`, { headers });
  categoryTrend.add(catRes.timings.duration);
  const catOk = check(catRes, {
    "categories status 200":        r => r.status === 200,
    "categories has body":          r => r.body && r.body.length > 2,
    "categories response < 1000ms": r => r.timings.duration < 1000,
  });
  if (!catOk) categoryErrors.add(1);
  errorRate.add(!catOk);

  sleep(0.5);

  // 2. Load items for first category
  let categoryId = 1;
  try {
    const cats = JSON.parse(catRes.body);
    categoryId = cats[Math.floor(Math.random() * cats.length)]?.id || 1;
  } catch (_) {}

  const itemsRes = http.get(`${BASE}/api/items?categoryId=${categoryId}`, { headers });
  check(itemsRes, {
    "items status 200":       r => r.status === 200,
    "items has data":         r => r.body && r.body.length > 2,
    "items response < 1500ms":r => r.timings.duration < 1500,
  });

  sleep(1);

  // 3. Try to stake WITHOUT auth (should get 401, not 500)
  const stakeRes = http.post(`${BASE}/api/stakes`,
    JSON.stringify({ itemId: 1, amount: 500, type: "directional", prediction: "up" }),
    { headers }
  );
  stakeTrend.add(stakeRes.timings.duration);
  const stakeOk = check(stakeRes, {
    "unauthenticated stake returns 401 not 500": r =>
      r.status === 401 || r.status === 403,
    "stake endpoint not crashing under load": r =>
      r.status !== 500 && r.status !== 503,
  });
  if (!stakeOk) stakeErrors.add(1);

  sleep(0.5);

  // 4. Check epoch status
  const epochRes = http.get(`${BASE}/api/epochs/current`, { headers });
  check(epochRes, {
    "epoch endpoint responds": r => r.status === 200 || r.status === 404,
    "epoch fast":              r => r.timings.duration < 500,
  });

  sleep(Math.random() * 2);  // Random think time between 0–2s
}

// ── Summary output ──────────────────────────────────────────────────
export function handleSummary(data) {
  const duration = data.metrics.http_req_duration;
  const failures = data.metrics.http_req_failed;

  const report = `
╔══════════════════════════════════════════════════════╗
║     STAR RANKER — Load Test Summary (500 users)      ║
╚══════════════════════════════════════════════════════╝

  Total Requests:    ${data.metrics.http_reqs?.values?.count || "N/A"}
  Failed Requests:   ${failures?.values?.passes || 0} (${((failures?.values?.rate || 0)*100).toFixed(2)}%)
  
  Response Times:
    Median:          ${duration?.values?.["p(50)"]?.toFixed(0) || "N/A"}ms
    95th Percentile: ${duration?.values?.["p(95)"]?.toFixed(0) || "N/A"}ms  (threshold: <2000ms)
    99th Percentile: ${duration?.values?.["p(99)"]?.toFixed(0) || "N/A"}ms  (threshold: <5000ms)
    Max:             ${duration?.values?.max?.toFixed(0) || "N/A"}ms

  Category endpoint median: ${data.metrics.category_response_ms?.values?.["p(50)"]?.toFixed(0) || "N/A"}ms
  Stake endpoint median:    ${data.metrics.stake_response_ms?.values?.["p(50)"]?.toFixed(0) || "N/A"}ms

  Thresholds: ${Object.entries(data.thresholds || {}).map(([k,v]) =>
    `\n    ${v.ok ? "✅" : "❌"} ${k}`).join("")}

  Verdict: ${Object.values(data.thresholds || {}).every(t => t.ok)
    ? "🚀 PASSED — Ready for 500 concurrent users"
    : "🔴 FAILED — Fix performance issues before beta launch"}
`;

  console.log(report);
  return {
    "load-test-report.txt": report,
    stdout: report,
  };
}
