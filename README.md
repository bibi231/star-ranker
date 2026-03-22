# ⚡ Star Ranker

> A real-time cultural prediction market where users vote, rank, and stake on anything — from crypto to music to sports. Powered by the **Star Oracle Protocol**.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set environment variables (copy .env.example to .env)
# Required: DATABASE_URL (Neon **Postgres** URI `postgresql://…`, not the REST URL), Firebase config
# On startup the API creates any missing tables (fresh Neon project = no manual `drizzle-kit push`).

# Start the Express API server
npm run server

# Start the Vite frontend (separate terminal)
npm run dev

# Seed the database (in browser or via HTTP)
# Visit: http://localhost:3001/api/seed-categories
# Then:  http://localhost:3001/api/seed-items/crypto (repeat per category)
```

### Production auth (Vercel + Render)

1. **Vercel (frontend)** — set all `VITE_FIREBASE_*` variables from Firebase Console. Set **`VITE_SUPER_ADMIN_EMAILS`** to the same comma-separated list as Render’s **`SUPER_ADMIN_EMAILS`** so Terminal / Meta Controls / Admin ZMG only appear for those accounts. Add your Vercel domain under **Authentication → Settings → Authorized domains** (e.g. `star-ranker.vercel.app`).
2. **Render (API)** — set `FIREBASE_SERVICE_ACCOUNT_JSON` to the **full JSON** of a Firebase service account (Project settings → Service accounts). Without this, `verifyIdToken` fails and logged-in users get **401** on `/api/admin/users/me`, voting, etc. Set **`SUPER_ADMIN_EMAILS`** (comma-separated) for who may use system-core admin APIs (seed, killswitch, revenue, ledger, …); redeploy after changing it.
3. **CORS** — any `https://*.vercel.app` origin is allowed by default; override with `CORS_ORIGIN` or comma-separated `CORS_ORIGINS` if needed.
4. Optional: `VITE_API_URL` on Vercel if the API base URL is not `https://star-ranker.onrender.com`.

### Categories / items missing (empty markets)

Data lives in **Postgres** (Neon). If the DB was reset, swapped, or never seeded, lists will be empty.

**Only “Cultural Zeitgeist” / `trending`:** The discovery worker creates that category plus a few items. The full **10 markets + ~1.5k items** come from a **full seed** (below). If Render logs show `relation "epochs" does not exist`, the API was an **older build** that only created `categories`/`items` — **push latest `main` to GitHub and redeploy** so startup + seed can create `epochs`, `market_meta`, and the rest.

**Ops Overwatch → Seed Database:** Same as `runFullSeed` (creates missing tables first). **Only super-admin emails** may call `POST /api/admin/seed` (see `SUPER_ADMIN_EMAILS` on the server). Everyone else should use **`GET /api/seed-database?key=…`** with `API_SEED_KEY`, or the public **`/api/seed-categories`** + **`/api/seed-items/:slug`** chain.

**Check DB connectivity:** `GET /api/health` (no DB) and `GET /api/health/db` (runs `SELECT 1` against Neon; on failure returns `detail` and `pgCode`, e.g. `28P01` = wrong password in `DATABASE_URL`).

**“Password authentication failed” / `28P01`:** Render’s `DATABASE_URL` does not match Neon (old password, typo, or new Neon project). In Neon: **Connection details** → copy the full **connection string** → Render → **Environment** → update `DATABASE_URL` → **Save** → **Manual Deploy**. The API retries a few times on boot for Neon resume; in production it **exits** if the DB never connects (so the deploy shows as failed instead of a “live” broken app). Set `ALLOW_START_WITHOUT_DB=1` only for debugging.

**Copying an old Neon database:** Render does not hold your data—only Neon does. To move data from an old project: use Neon **branch/restore** if available, or `pg_dump` from the old database and restore into the new one (Neon docs / SQL editor). After that, point `DATABASE_URL` at the database that has the data.

**Option A — one request (after setting a secret on Render)**  
1. In Render → your API service → **Environment**, add `API_SEED_KEY` to a long random string. Redeploy.  
2. Open (replace `YOUR_KEY`):  
   `https://star-ranker.onrender.com/api/seed-database?key=YOUR_KEY`  
3. You should see JSON like `{ "success": true, "categories": 10, "items": … }`. Refresh the app.

**Option B — public endpoints (no secret)**  
1. `https://star-ranker.onrender.com/api/seed-categories`  
2. For each category slug, e.g.  
   `https://star-ranker.onrender.com/api/seed-items/crypto`  
   Repeat for: `smartphones`, `music`, `websites`, `tech`, `movies`, `athletes`, `fashion`, `games`, `influencers`.

**Option C — from your machine** (with `DATABASE_URL` in `.env`):  
`npx tsx server/seedAll.ts`

---

## 📚 Architecture

```
star-ranker/
├── server/                 # Express.js API (TypeScript)
│   ├── index.ts            # Server entry, routes, background engines
│   ├── db/                 # Drizzle ORM + Neon Postgres
│   │   ├── schema.ts       # Database schema (categories, items, stakes, epochs, users, market_meta)
│   │   └── index.ts        # Database connection
│   ├── routes/             # API endpoints
│   │   ├── categories.ts   # GET /api/categories
│   │   ├── items.ts        # GET /api/items?category=slug
│   │   ├── votes.ts        # POST /api/votes
│   │   ├── stakes.ts       # POST /api/stakes, GET /api/stakes/odds
│   │   ├── epochs.ts       # GET /api/epochs/current
│   │   ├── leaderboard.ts  # GET /api/leaderboard
│   │   └── admin.ts        # POST /api/admin/seed, /users/me, /settle, /stats
│   ├── engine/             # Background processing
│   │   ├── rankingEngine.ts    # Reifies rankings every 60s
│   │   ├── epochScheduler.ts   # Auto-rolls epochs every 30 min
│   │   ├── settlement.ts       # Pool-based stake settlement
│   │   ├── coinGecko.ts        # Live crypto price feed
│   │   └── zeitgeist.ts        # Automated market discovery
│   ├── middleware/
│   │   ├── auth.ts          # Firebase Auth token verification
│   │   └── geo.ts           # Geo-IP jurisdictional gating
│   ├── lib/
│   │   └── email.ts         # Email engine (welcome + settlement)
│   └── data/
│       └── seedData.ts      # 1,000 items across 10 categories
├── src/                     # React + Vite frontend
│   ├── App.jsx              # Main app with routing
│   ├── store/useStore.js    # Zustand state management
│   ├── lib/api.js           # Fetch wrapper with Firebase auth
│   ├── components/
│   │   ├── RankingTable.jsx     # Item list with vote/stake controls
│   │   ├── StakeModal.jsx       # Staking interface
│   │   ├── LegalModal.jsx       # First-visit legal agreement
│   │   ├── Web3Status.jsx       # MetaMask detection indicator
│   │   ├── LiveTicker.jsx       # Real-time market ticker
│   │   └── layout/MainLayout.jsx # Sidebar, header, currency toggle
│   └── pages/
│       ├── MarketPage.jsx       # Category-based market view
│       ├── LeaderboardPage.jsx  # Top stakers
│       └── ...
└── LEGAL.md                 # Terms of Oracle Service
```

---

## 🎯 Core Logic

### How Ranking Works

1. **Users vote** ↑ or ↓ on items in any category
2. Every **60 seconds**, the Ranking Engine sorts items by cumulative score
3. Items have: `score`, `velocity` (rate of change), `momentum`, `volatility`
4. The **Anti-Whale (AVD) system** dampens items getting abnormally fast votes

### How Epochs Work

- **Duration**: 30 minutes each
- The Epoch Scheduler auto-creates a new epoch when the previous one expires
- Rankings are **"reified"** (snapshotted) at epoch end
- All active stakes are **settled** at epoch boundary

### How Staking Works (DMAO — Dynamic Market Arbitrage Oracle)

```
User places $100 stake on "Bitcoin hits Rank #1"
          │
          ▼
    ┌─────────────────┐
    │ 5% PLATFORM FEE │ → $5 goes to Platform Revenue
    └────────┬────────┘
             │
          $95 NET STAKE enters the Risk Pool
             │
             ▼
    ┌─────────────────┐
    │  ODDS CALCULATED │ Based on:
    │                  │  • Item's current rank vs target
    │                  │  • Market volatility & momentum
    │                  │  • Time remaining in epoch
    │                  │  • Total pool exposure
    │                  │  • Liquidity conditions
    └────────┬────────┘
             │
          EFFECTIVE MULTIPLIER (e.g., 3.2x)
             │
             ▼
    User sees: "Estimated payout: ~$304"
    (This is VARIABLE — changes as more stakers enter)
```

### Understanding "Estimated Payout"

The payout shown during staking is an **estimate based on current conditions**. It is NOT guaranteed because:

1. **More stakers may enter** → changes the pool size and multipliers
2. **Rankings shift** → base probabilities change
3. **At settlement**, payouts come from the **loser pool** (see below)

**We show "Est. Payout" with a disclaimer** that it's variable. This is similar to how parimutuel betting (horse racing, pools) works — final odds aren't known until the market closes.

### Pool-Based Settlement (How Payouts Work)

```
EPOCH ENDS → Settlement Oracle activates
         │
         ▼
    ┌─────────────────────────┐
    │ PHASE 1: Judge Winners  │
    │ Check actual rank vs    │
    │ each stake's target     │
    └────────────┬────────────┘
                 │
         ▼               ▼
    WINNERS          LOSERS
    (target hit)     (target missed)
                         │
                         ▼
                  ┌──────────────┐
                  │ LOSER POOL   │ ← All losing stakes form the payout pool
                  │ e.g., $5,000 │
                  └──────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    Winner A         Winner B        Winner C
    $95 × 3.2x      $200 × 1.8x     $50 × 5.0x
    = $304           = $360           = $250
    
    Total Target Payouts = $914
    
    If Pool ($5,000) > Target ($914):
      → Winners get FULL payout
      → Remaining $4,086 → Platform Revenue
    
    If Pool ($500) < Target ($914):
      → Scale factor = 500/914 = 0.547
      → Winner A gets: $304 × 0.547 = $166
      → Winner B gets: $360 × 0.547 = $197
      → Winner C gets: $250 × 0.547 = $137
      → Platform gets: $0 extra (pool fully distributed)
```

**KEY PRINCIPLE**: The platform NEVER pays from its own pocket. All payouts come from losing stakers.

---

## 💰 Revenue Model (How You Make Money)

| Revenue Stream | Description | Rate |
|---|---|---|
| **Stake Fee** | 5% commission on every stake placed | 5% of volume |
| **Pool Surplus** | Leftover loser pool after all winners paid | Variable |
| **Spread** | Margin baked into odds calculation | ~4% |
| **Future: Paystack Deposits** | Transaction fees on fiat top-ups | ~1.5% |
| **Future: Premium Features** | Enhanced analytics, priority alerts | Subscription |

### Example Revenue Calculation

If 100 users stake $10,000 total in an epoch:
- **Stake fees**: $10,000 × 5% = **$500** (guaranteed)
- **Pool surplus**: Depends on outcomes, estimated 10-30% of loser pool
- **Spread**: Already embedded in multiplier calculations

---

## 🌍 Market Categories (10 × 100 items = 1,000 total)

| Category | Items | Description |
|---|---|---|
| Crypto Assets | 100 | BTC, ETH, SOL, and 97 more coins |
| Smartphones | 100 | iPhone 16, Galaxy S25, Pixel 9, etc |
| Music Artists | 100 | Taylor Swift, Drake, Burna Boy, etc |
| Websites & Apps | 100 | Google, TikTok, ChatGPT, etc |
| Tech Companies | 100 | Apple, NVIDIA, OpenAI, etc |
| Movies & TV | 100 | Squid Game, Dune, Severance, etc |
| Athletes | 100 | Messi, Mbappé, Wembanyama, etc |
| Fashion & Brands | 100 | Gucci, Nike, Supreme, etc |
| Video Games | 100 | GTA VI, Fortnite, Elden Ring, etc |
| Creators | 100 | MrBeast, Kai Cenat, MKBHD, etc |
| Cultural Zeitgeist | Auto | Discovered by AI zeitgeist engine |

---

## 🔒 Compliance & Legal

### Jurisdictional Gating

The `geo.ts` middleware detects user country and enforces restrictions:

| Restriction Level | Countries | Effect |
|---|---|---|
| **Full Block** | CU, IR, KP, SY, RU | Cannot access platform |
| **Staking Blocked** | AE, SA, QA, BH, KW, OM | Can view/vote, cannot stake |

### First-Visit Legal Gate

`LegalModal.jsx` displays a full-screen overlay requiring users to acknowledge:
- Platform beta status
- Jurisdictional restrictions
- Risk of loss
- Terms of Oracle Service

### Legal Framework

See `LEGAL.md` for the full Terms of Oracle Service.

---

## 🌐 Localization

### Multi-Currency

Users can toggle between USD, NGN, and EUR in the header. All balance displays auto-convert:
- **$10,000** → **₦15,000,000** → **€9,200**

Conversion rates are stored in the Zustand store and can be updated via API in production.

### Web3 Detection

The `Web3Status.jsx` component checks for `window.ethereum` (MetaMask, etc.) and displays:
- 🟢 "Web3 Node Active" — wallet detected
- 🟡 "Web3 Missing" — no wallet found

---

## 📧 Email System

| Email | Trigger | Template |
|---|---|---|
| Welcome | First user login/registration | Branded onboarding message |
| Settlement: Win | Stake resolved as win | "You won $X on [item]" |
| Settlement: Loss | Stake resolved as loss | "Your stake on [item] did not hit" |

**Provider**: Configured via `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `.env`. Uses console logging in dev mode.

---

## ✅ What's Implemented

- [x] Full Express.js API with 12+ route files
- [x] Neon Postgres + Drizzle ORM (9 tables)
- [x] Firebase Authentication (Google + Email/Password)
- [x] Real-time ranking engine (60s refresh)
- [x] 30-minute epoch cycle with auto-rollover
- [x] CoinGecko live crypto price feed
- [x] Pool-based settlement with platform fees
- [x] 5% platform commission on every stake
- [x] 11 market categories × ~100 items (1,025 total)
- [x] Auto-discovery zeitgeist worker
- [x] Geo-IP jurisdictional gating
- [x] Legal modal (first-visit agreement)
- [x] Legal pages (Terms, Privacy, Responsible Play)
- [x] Multi-currency display (USD/NGN/EUR)
- [x] Web3 wallet detection
- [x] Email notifications via Brevo SMTP (welcome + settlement)
- [x] Mobile-responsive RankingTable
- [x] Optimistic UI updates with rollback
- [x] Paystack Integration (test keys, webhook, deposits)
- [x] Beta Invite System (50 gated invite codes)
- [x] Rate Limiting (global, staking, admin)
- [x] Zod input validation on all critical routes
- [x] Power Vote Packs (Starter/Booster/Power)
- [x] Sponsored Item Placements (gold badge, pinned)
- [x] Referral System (1% commission, auto-generated codes)
- [x] Admin Revenue Dashboard (platform tax, TVL, velocity chart)
- [x] Admin Operational Overwatch (killswitch, epoch control, market freeze)
- [x] Admin account provisioned (Oracle tier)
- [x] Sentry error monitoring (boilerplate — needs DSN)

## 🔲 What's Remaining for Full Launch

- [ ] **Production Deployment** — Render.com (API) + Vercel (Frontend)
- [ ] **Real Geo-IP Provider** — Integrate ipapi.co or Cloudflare Workers for production
- [ ] **WebSocket Updates** — Real-time ranking changes without polling
- [ ] **Web3 Wallet Connect** — Enable actual crypto payouts via MetaMask

## 💡 Future Roadmap (Post-Launch)

- [ ] **Google Trends API** — Auto-discover trending cultural items
- [ ] **Social API Integration** — Twitter/X trending topics → new market items
- [ ] **Achievement System** — Badges, streaks, milestones
- [ ] **Market Creation** — Users propose new categories (governance)
- [ ] **Liquidity Mining** — Rewards for early/frequent stakers
- [ ] **Mobile App** — React Native wrapper
- [ ] **Multi-language Support** — i18n for global markets
- [ ] **Advanced Analytics** — Historical charts, win rate tracking
- [ ] **Tournament Mode** — Time-limited competitive staking events
- [ ] **Pro Membership** — Premium tier with enhanced features

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | UI framework |
| State | Zustand | Client state management |
| Styling | Vanilla CSS + Tailwind-style classes | Design system |
| Auth | Firebase Authentication | User management |
| API | Express.js (TypeScript) | Backend server |
| ORM | Drizzle ORM | Type-safe DB access |
| Database | Neon Postgres (Free Tier) | Serverless Postgres |
| Email | Nodemailer | Transactional emails |
| Crypto Feed | CoinGecko API | Real-time prices |

---

## 📜 License

Proprietary — All rights reserved.
