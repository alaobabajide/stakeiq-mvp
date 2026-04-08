# StakeIQ MVP

A Nigerian sports betting platform with KYC, live odds, betslip, tipsters, withdrawals, and responsible gambling tools.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (mobile shell UI) |
| Backend | Node.js + Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT + bcrypt PIN |

## Database Schema

```
users          — accounts, KYC status, role
kyc            — BVN, ID docs, selfie, address (1:1 user)
wallets        — balance, totals (1:1 user)
transactions   — every money movement with before/after balance
matches        — leagues, teams, scores, status
odds           — HOME_WIN / DRAW / AWAY_WIN per match
betslips       — placed bets with stake + potential win
betslip_items  — individual selections per betslip
bsr            — Bettor Skill Rating score + win rate (1:1 user)
tipsters       — verified tipster profiles (1:1 user)
tips           — individual tips from tipsters
tipster_subscriptions — user ↔ tipster monthly sub
withdrawals    — payout requests with method + status
spending_limits — monthly/weekly/daily caps per user
self_exclusions — account pause records
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally
- Create database: `createdb stakeiq_db`

### Quick Start
```bash
# Update DATABASE_URL in backend/.env if needed, then:
./setup.sh
```

### Manual Setup
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
node src/seed.js
npm run dev   # http://localhost:3001

# Frontend (new terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login with PIN |
| GET | /api/auth/me | ✓ | Current user |
| GET | /api/kyc/status | ✓ | KYC state |
| POST | /api/kyc/bvn | ✓ | Submit BVN + ID type |
| POST | /api/kyc/upload | ✓ | Upload ID photos |
| POST | /api/kyc/selfie | ✓ | Upload selfie |
| POST | /api/kyc/submit | ✓ | Final KYC submission |
| GET | /api/matches | ✓ | All live + upcoming |
| GET | /api/matches/live | ✓ | Live matches |
| GET | /api/betslip/place | ✓+KYC | Place a bet |
| GET | /api/betslip/history | ✓ | Bet history |
| GET | /api/wallet | ✓ | Wallet balance |
| POST | /api/wallet/deposit | ✓+KYC | Deposit funds |
| GET | /api/tipsters | ✓ | List tipsters |
| POST | /api/withdraw/request | ✓+KYC | Withdrawal request |
| GET | /api/stats/me | ✓ | Spending dashboard |
| PUT | /api/stats/spending-limit | ✓ | Update budget cap |
| POST | /api/stats/self-exclusion | ✓ | Take a break |

## Demo Credentials
- **Phone:** 08123456789
- **PIN:** 1234
- KYC: Pre-approved
- Balance: ₦4,850

## Screens
Splash → Onboard → Register → KYC (5 steps) → Home → Betslip → Tipsters → Withdraw → My Stats
