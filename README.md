# Star Ranker: The Competitive Zeitgeist Platform

Star Ranker is a state-of-the-art, decentralized-inspired ranking and staking platform that tracks the global zeitgeist of culture, technology, and finance. Leveraging a server-authoritative physics engine, the platform enables users to stake on the future performance of items across diverse categories, from Cryptocurrencies to Smartphones.

---

## 🚀 Project Overview

The primary mission of Star Ranker is to provide a transparent, fair, and high-stakes environment for market prediction. Unlike traditional ranking systems that rely on static upvotes, Star Ranker treats every item as a "market participant" governed by momentum, velocity, and volatility.

### Core Functionality
- **Dynamic Rankings**: Items are ranked using a multi-signal scoring algorithm that combines social sentiment, factual data, and user interaction.
- **Predictive Staking**: Users "Deploy Stakes" on where an item will rank at the end of a temporal window (Epoch).
- **Automated Market Generation**: The "Zeitgeist Market Generator" (ZMG) autonomously discovers and manages the lifecycle of hundreds of items.
- **Temporal Epochs**: The system operates on a heartbeat of 30-minute epochs, providing discrete boundaries for market snapshots and settlements.

---

## ✨ Key Features

### 1. Dynamic Market-Adjusted Odds (DMAO)
The "brain" of the staking system. It replaces naive betting odds with a physics-based model ([dmao.ts](file:///functions/src/staking/dmao.ts)).
- **Implied Probability**: Uses a sigmoid curve to calculate the likelihood of an outcome based on an item's current distance to target and its velocity.
- **Whale Dampening**: Applies concave slippage (sqrt scaling) to large stakes, preventing single "whales" from destabilizing the market or draining the platform escrow.
- **Liquidity Adjustment**: Odds shift in real-time based on the platform's open interest and available safety ratios.

### 2. Zeitgeist Market Generator (ZMG)
An autonomous background worker ([runner.ts](file:///functions/src/zeitgeist/runner.ts)) that enriches markets without manual intervention.
- **Signal Multi-Plexing**: Fetches data from Wikipedia (factual) and Reddit (social velocity).
- **Scoring & Decay**: Applies exponential decay to stale items while boosting "rising stars" with high social momentum.
- **Anti-Manipulation (AVD)**: Includes Anomalous Velocity Detection to dampen artificial spikes in item scores.

### 3. Temporal Epoch System
A heartbeat mechanism ([manager.ts](file:///functions/src/epochs/manager.ts)) that governs the platform's lifecycle.
- **Atomic Snapshots**: At the end of every epoch, the system freezes market states and takes an immutable snapshot.
- **Settlement Oracle**: An automated process evaluates all active stakes against these snapshots, distributing payouts based on strategies (Exact, Range, or Directional).

### 4. Admin Overwatch & RBAC
A comprehensive administrative suite ([AdminOpsPage.jsx](file:///src/pages/AdminOpsPage.jsx)) featuring:
- **Temporal Sovereignty**: Control over epoch pauses and manual rollovers.
- **System Killswitch**: Immediate platform freeze for security or market protection.
- **Audit Logs**: Full transparency of all administrative actions.

---

## 🛠 Technology Stack

### Frontend
- **React 19 + Vite**: High-performance UI rendering.
- **Tailwind CSS + Lucide React**: Premium, "Quantum" aesthetic and iconography.
- **Zustand**: Lightweight, high-speed state management with optimistic updates.
- **Framer Motion**: Smooth micro-animations and transition handling.
- **React Window**: Virtualized lists for markets with 300+ items.

### Backend (Firebase)
- **Cloud Functions (v2)**: Core logic, periodic tasks, and secure entrypoints.
- **Firestore**: Scalable NoSQL real-time database.
- **Firebase Auth**: Secure identity management with RBAC support.
- **Firebase Scheduler**: Governs the 1m cron heartbeat and 12h ZMG runs.

### DevOps & Tools
- **ESLint/Prettier**: Code quality and consistency.
- **Playwright**: Browser-level verification and UI automation.
- **Lodash**: Utility belt for debouncing and complex data manipulation.

---

## 🏗 Architecture & Workflow

### Data Flow
1. **Ingestion**: ZMG fetches external signals and updates `items` collection.
2. **Reification**: `reifyMarkets` (Functions) summarizes item data into display-ready rankings.
3. **Staking**: Users interact with `StakeModal`, fetching real-time `getLiveOdds` quotes from the DMAO engine.
4. **Placement**: `placeStakeV2` executes a cross-collection transaction to update user balance, market exposure, and stake records.
5. **Rollover**: `manageEpochs` snapshots rankings every 30m.
6. **Settlement**: `settlePredictions` evaluates outcomes and credits users.

### Component Hierarchy
```
App.jsx (Router)
└── MainLayout.jsx (Header/SideNav/Auth)
    └── DashboardPage.jsx
    └── CategoryPage.jsx (RankingTable)
        └── StakeModal.jsx (DMAO UI)
    └── AdminOpsPage.jsx (Temporal Controls)
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Clone & Install
```bash
git clone https://github.com/your-org/star-ranker.git
cd star-ranker
npm install
cd functions && npm install && cd ..
```

### 2. Firebase Configuration
Create a project in the [Firebase Console](https://console.firebase.google.com/) and update `src/firebase.js` with your credentials.

### 3. Environment Variables
Create a `.env` in the root (for frontend) and `functions/.env` (for backend) if necessary. Primarily uses Firebase config.

### 4. Run Locally
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Functions Emulator
firebase emulators:start
```

---

## 📖 Usage Instructions

- **Voting**: Use the Up/Down arrows to influence an item's score. Reputation higher than 100 grants "Power Votes".
- **Staking**:
  - Click any item to open the **Quantum Stake Modal**.
  - Select a strategy: **Exact** (Price Rank), **Range** (Rank Bracket), or **Directional** (Displacement).
  - Preview your potential payout and the "Whale Dampening" slippage applied by the DMAO engine.
- **Admin**: Access `/admin/ops` to manage the system heartbeat or `/admin/zmg` to monitor the autonomous market generator.

---

## 🚢 Deployment

1. **Build Frontend**: `npm run build`
2. **Deploy Platform**:
```bash
firebase deploy --only hosting,firestore,functions
```
*Note: Ensure the Artifact Registry Writer role is assigned to the Firebase Service Account for Cloud Functions v2 deployment.*

---

## 🧪 Testing

The project uses **Playwright** for end-to-end verification.
- **Run E2E Tests**: `npx playwright test`
- **UI Mode**: `npx playwright test --ui`

Testing focuses on:
- Auth Guard integrity (verified accounts only for staking).
- DMAO quote accuracy under varying capital loads.
- Atomic settlement consistency during epoch rollovers.

---

## 📔 Developer Notes

- **Optimistic UI**: Zustand mutations are optimistic. Rolebacks are handled automatically in `performMutation` if server calls fail.
- **Time Sync**: `serverTimeOffset` in the store is critical. It ensures local countdowns match the authoritative server clock.
- **Late-Epoch Lock**: Staking is disabled 60s before rollover to prevent "last-second" market manipulation.
- **Quirks**: The ZMG Wikipedia fetcher caches responses to avoid rate limits; manual triggers bypass this cache.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/quantum-logic`.
3. Adhere to the ESLint rules defined in the root.
4. Ensure all new functions are exported from `functions/src/index.ts`.
5. Submit a PR with a clear summary of changes.

---

## 📜 References & Credits

- **Lucide React**: For the sleek iconography.
- **Framer Motion**: Enabling high-end physics animations.
- **Wikipedia API**: For factual signal ingestion.
- **Zustand**: Powering the high-speed state orchestration.

---
© 2026 Star Ranker Engineering. All Rights Reserved.
