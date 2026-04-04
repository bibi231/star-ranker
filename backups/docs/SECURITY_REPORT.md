# Security Audit & Credentials Report
**Session Date:** 2026-03-16
**Status:** COMPLETE / VERIFIED

## Super Admins
Full administrative control (Killswitch, Manual Settlement, System Reset).

| Email | Role | Verification |
|-------|------|--------------|
| admin@starranker.io | Lead Curator | Verified via `devOverrideLogin` |
| peterjohn2343@gmail.com | System Architect | Hardcoded in `admin.ts` / Super Admin |

## Moderators
Maintenance access (Seeding, Manual Reification).

| Email | Role | Verification |
|-------|------|--------------|
| mod@starranker.io | Global Moderator | Verified via `devOverrideLogin` |

## Standard Testing Accounts
| Email | Scope |
|-------|-------|
| user@starranker.io | Retail Workflow Testing |

## System Identifiers
- **Master Gateway Code:** `STAR-BETA-2026`
- **Beta Invite (Reusable):** `BETA2026`
- **Database Architecture:** Neon Serverless (Hardened Connection Pool)
- **Market Data Provider:** CoinGecko (Asynchronous Feed)
