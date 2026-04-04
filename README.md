# ⚡ Star Ranker — Universal Platform Manifest (v1.2-STABLE)

> A real-time, decentralized-style **Oracle Network** and cultural prediction market where users vote, rank, and stake on any global entity — from Crypto to Music to Tech. Powered by the **Star Oracle Protocol**.

---

## 🏛️ System Overview

Star Ranker is a high-fidelity "Oracle Network" and prediction market platform where users influence and predict the relative rankings of real-world entities. It uniquely combines community sentiment (Voting) with financial forecasting (Staking).

### A. Core Functional Pillars
1.  **The Oracle Network**: Items are ranked based on **Signal Score** (cumulative votes) and **Market Velocity** (staking activity). Rankings are updated every 60 seconds.
2.  **Settlement Cycles (Epochs)**: Markets "settle" every 30 minutes. Rankings are snapshotted (reified) to calculate dynamic payouts.
3.  **Influence Tiers**: User levels (**Bronze → Diamond**) determine the weight of their votes and the maximum stake limits allowed.
4.  **Anti-Whale (AVD)**: Automated Velocity Detection dampens abnormally fast spikes to ensure fair market play.

### B. Dual-Mode Architecture (Live vs. Practice Stars ★)
- **Live Mode**: Real capital stakes with monetary payouts. Full multi-currency support (USD, NGN, EUR, etc.).
- **Practice Mode (Stars ★)**: High-fidelity simulation for strategy refinement.
  - **Initial Balance**: ★50,000 (Stars).
  - **Synchronized Odds**: Uses the exact same math and pool-logic as Live mode.
  - **Visual Branding**: Characterized by **Amber accents** and Star (★) icons.

---

## 🚀 Technical Stack (The "Oracle Core")

- **Frontend**: React 19 (Vite), Tailwind CSS v4 (Rich Terminal aesthetic).
- **State Sovereignty**: Zustand-powered `storeModel.jsx` (Single source of truth).
- **Backend Infrastructure**: Express (TypeScript), Drizzle ORM.
- **Database**: PostgreSQL (Neon Serverless) with hardened connection pooling.
- **Micro-Interactions**: Framer Motion + Lucide-React.

---

## 🔮 Market Mechanics & Staking (DMAO)

### 1. How Ranking Works
Items are sorted by a cumulative algorithm:
- **Score**: Raw vote balance (↑ - ↓). Supports **Anonymous Voting** (IP-fingerprinted).
- **Velocity**: Rate of ranking change over time.
- **Momentum & Volatility**: Calculated as market pressure metrics in real-time.

### 2. DMAO Staking (Dynamic Market Arbitrage Oracle)
All staking uses a pool-based parimutuel model:
- **5% Platform Fee**: Applied to every stake for network maintenance.
- **Effective Multiplier**: Calculated based on target rank, pool exposure, and "Time-to-Epoch".
- **Loser-Pool Payout**: All winnings are distributed from the losing stakers' pools; the platform is market-neutral.

---

## 🛡️ Security Audit & Administrative Overwatch

### Administrative Control
Only verified Super Admins have access to the **Ops Overwatch** (System Killswitch, Manual Settlement, Seeding).

| Email | Role | Clearance |
| :--- | :--- | :--- |
| `peterjohn2343@gmail.com` | System Architect | Super Admin (Hardcoded) |
| `admin@starranker.io` | Lead Curator | Super Admin |
| `mod@starranker.io` | Moderator | Maintenance Only |

### System Credentials
- **Master Gateway Code**: `STAR-BETA-2026`
- **Beta Invite**: `BETA2026`
- **Infrastructure**: Neon Serverless + CoinGecko Async Feed.

---

## ⚖️ Legal & Jurisdictional Compliance

### Jurisdictional Gating
The `geo.ts` middleware enforces strict regional restrictions based on Edge-IP detection:
- **Full Block**: CU, IR, KP, SY, RU (Total restriction).
- **Staking Blocked**: AE, SA, QA, BH, KW, OM (Votes only, no financial staking).

### Terms of Oracle Service
- **Nature**: Staking is a "vote of confidence" in future popularity; it is NOT a financial derivative or investment.
- **Risks**: Users acknowledge the risk of capital loss and the finality of 30-minute Epoch Reification.
- **Privacy**: Geo-IP data is processed at the edge and not stored permanently in user profiles.

---

## 📜 Developer Guide & Implementation Standards

### 1. Mobile-First Engineering
- **Bottom Navigation**: Fixed tab bar for Thumb Zone navigation.
- **Sheets > Modals**: All primary actions use full-screen bottom sheets (85% height).
- **Viewport**: Optimized for iOS/Android using `viewport-fit=cover`.
- **Input Reset**: All inputs set to `16px` to prevent automatic browser zooming on mobile.

### 2. Data & State Map
- **ID Management**: Always use `item.docId` for target identification.
- **Persistence**: User profile settings (Alerts, UI preferences) are updated via `PATCH /api/user/profile`.
- **Mode Toggle**: Use the `isDemoMode` boolean to toggle symbols (USD/★) and color tokens (Emerald/Amber).

---

## 🚀 Quick Start (Deployment & Setup)

1.  **Install**: `npm install`
2.  **Environment**: Copy `.env.example` to `.env`. Required: `DATABASE_URL`, `FIREBASE_CONFIG`.
3.  **Development**: `npm run server` (API) and `npm run dev` (Frontend).
4.  **Seed**: Visit `/api/seed-database` with `API_SEED_KEY` to populate categories.

---
*Created by Antigravity (Advanced Agentic Coding) for Star Ranker Operations. This document is the consolidated source of truth for the platform manifest, legal terms, and security protocols.*
