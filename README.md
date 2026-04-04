# ⚡ Star Ranker — Core Platform Manifest (v1.1)

> A real-time, decentralized-style **Oracle Network** and cultural prediction market where users vote, rank, and stake on any global entity — from Crypto to Music to Tech. Powered by the **Star Oracle Protocol**.

---

## 🚀 Quick Start (Deployment & Setup)

### 1. Local Environment
```bash
# Install dependencies
npm install

# Set environment variables (copy .env.example to .env)
# Required: DATABASE_URL (Neon Postgres), FIREBASE_CONFIG
# On startup, the API auto-creates missing tables.

# Start the Express API server
npm run server

# Start the Vite frontend (separate terminal)
npm run dev

# Seed the database
# Visit: http://localhost:3001/api/seed-database (requires API_SEED_KEY)
```

### 2. Production Configuration (Vercel + Render)
- **Vercel (Frontend)**: Set `VITE_FIREBASE_*` and `VITE_SUPER_ADMIN_EMAILS`.
- **Render (API)**: Set `FIREBASE_SERVICE_ACCOUNT_JSON`, `DATABASE_URL`, and `SUPER_ADMIN_EMAILS`.
- **Note**: `VITE_SUPER_ADMIN_EMAILS` on Vercel must match `SUPER_ADMIN_EMAILS` on Render to grant administrative clearance.

---

## 🏛️ System Architecture

### A. Core Functional Pillars
1.  **The Oracle Network**: Items are ranked based on **Signal Score** (votes) and **Market Velocity** (staking).
2.  **Settlement Cycles (Epochs)**: Markets "settle" every 30 minutes. Rankings are snapshotted (reified) to calculate payouts.
3.  **Influence Levels**: User "Tiers" (Bronze → Diamond) determine vote weight and stake limits.

### B. Dual-Mode Architecture (Live vs. Practice Stars ★)
- **Live Mode**: Real capital stakes with monetary payouts.
- **Practice Mode (Stars ★)**: High-fidelity simulation for strategy refinement.
  - Startup Balance: ★50,000 (Stars).
  - **Currency Parity**: Stars (★) convert dynamically alongside the platform's multi-currency system (USD, EUR, NGN, etc.).
  - Branding: Identified by **Amber accents** and Star (★) icons.

---

## 🔮 The Oracle Network (Market Mechanics)

### 1. How Ranking Works
Items are sorted by a cumulative algorithm every 60 seconds:
- **Score**: Raw vote balance (↑ - ↓).
- **Velocity**: Rate of ranking change.
- **Momentum & Volatility**: Calculated market pressure metrics.
- **Anti-Whale (AVD)**: Automated Velocity Detection dampens abnormally fast spikes to ensure fair play.

### 2. DMAO Staking (Dynamic Market Arbitrage Oracle)
All staking uses a pool-based parimutuel model:
- **5% Platform Fee**: Applied to every stake for network maintenance.
- **Effective Multiplier**: Calculated based on target rank, pool exposure, and time remaining.
- **Loser-Pool Payout**: The platform never pays from its own pocket; all winnings are distributed from losing stakers' pools.

---

## 🛡️ Security Audit & Credentials

### Administrative Control
Only verified Super Admins have access to the **Ops Overwatch** (Killswitch, Manual Settlement).

| Email | Role | Clearance |
| :--- | :--- | :--- |
| `peterjohn2343@gmail.com` | System Architect | Super Admin |
| `admin@starranker.io` | Lead Curator | Super Admin |
| `mod@starranker.io` | Moderator | Maintenance Only |

### System Identifiers
- **Gateway Code**: `STAR-BETA-2026`
- **Beta Invite**: `BETA2026`
- **Infrastructure**: Neon Serverless (Hardened Connection Pool) + CoinGecko Async Feed.

---

## ⚖️ Legal & Jurisdictional Compliance

### Jurisdictional Gating
The `geo.ts` middleware enforces strict regional restrictions:
- **Full Block**: CU, IR, KP, SY, RU (Total restriction).
- **Staking Blocked**: AE, SA, QA, BH, KW, OM (Votes only, no financial staking).

### Terms of Oracle Service
- **Nature**: Staking is a "vote of confidence" in future popularity; it is NOT a financial derivative.
- **Risks**: Users acknowledge the risk of loss and the finality of 30-minute Epoch Reification.

---

## 📱 Mobile-First Engineering Standard (FULL)

*The following standards define the mobile-native feel of Star Ranker, inspired by Polymarket and Kalshi.*

### 0 — Design Philosophy
- **Bottom Navigation**: Fixed tab bar for Thumb Zone navigation.
- **Cards Over Tables**: Tables reflow into compact, tappable card lists.
- **Full-Screen Modals**: Trade panels open as bottom sheets (85% height).
- **Large Touch Targets**: Minimum 48px height for all primary actions.

### 1 — Technical Constraints
- **Viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`
- **iOS Resets**: Prevent font inflation and pull-down bounce via `overscroll-behavior: none`.
- **Safe Area Insets**: Use `env(safe-area-inset-*)` for notch and home indicator clearance.

### 2 — Implementation Path (Bottom Sheets & Nav)
- **BottomNav.jsx**: Fixed bottom bar (Markets/Stake/Rankings/Profile).
- **MobileCardList**: Specialized render path for `RankingTable` on small screens.
- **Input Zoom Prevention**: All inputs MUST have `font-size: 16px` to prevent jarring iOS Safari zoom.

---

## 📜 API & Technical Standards

### Developer Guidelines
- **ID Management**: Always use `item.docId` for target identification in frontend components.
- **State Sovereignty**: `storeModel.jsx` (Zustand) is the single source of truth for balances and mode-toggles.
- **Persistence**: User profile settings are updated via `PATCH /api/user/profile`.

### App Data Map
| Surface | Primary API Endpoint | DB Tables |
| :--- | :--- | :--- |
| Portfolio | `/api/stakes/my` | `users`, `stakes` |
| Settings | `/api/user/profile` | `users` (bio, settings) |
| Activity | `/api/activity` | `market_activity` |

---

## ✅ Feature Implementation Checklist

- [x] Full Express/Drizzle Core with 9 DB Tables
- [x] Dual-Mode Branding (Live/Practice ★)
- [x] Real-time Ranking (60s) & Epochs (30m)
- [x] Multi-Currency (USD/NGN/EUR) with conversion logic
- [x] Jurisdictional Gating & Legal Agreement Gate
- [x] Admin Revenue & Overwatch Dashboard
- [x] Power Vote Packs & Sponsored Item badging
- [x] Paystack Deposit Integration (Webhook verified)
- [x] **New**: FAQ & API Documentation navigation links

---
*Created by Antigravity (Advanced Agentic Coding) for Star Ranker Operations. This document is the definitive source of truth.*
