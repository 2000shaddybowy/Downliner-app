# Downline / Upline Commission App

A referral network app: members sign up under an upline via a referral code,
pay into the system, and commissions get split up the chain automatically.

## What's included
- `schema.sql` — Postgres schema (members, transactions, commissions, payouts)
- `server/` — Node/Express API: auth, downline tree, Paystack payments + webhook, commission engine
- `client/` — React frontend: signup/login, dashboard, live downline tree, payment button

## How commissions work
See `server/services/commissions.js`. When a payment succeeds, the app walks
up the payer's referral chain and pays each ancestor a percentage
(10% direct upline, 5% level 2, 3% level 3, 2% level 4, 1% level 5 — edit
`LEVEL_RATES` to change this). Every commission is logged in the
`commissions` table for a full audit trail, and credited to the earner's
`wallet_balance`.

## Setup

### 1. Database
```
createdb downline_app
psql downline_app < schema.sql
```
Postgres needs the `pgcrypto` extension for `gen_random_uuid()`:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 2. Backend
```
cd server
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, PAYSTACK_SECRET_KEY
npm install
npm run dev
```

### 3. Frontend
```
cd client
npm install
npm run dev
```
Set `VITE_API_URL` in a `client/.env` file if your API isn't on localhost:4000.

## Paystack setup (payments)
1. Create a Paystack account (paystack.com) — supports Ghana (GHS).
2. Get your **test** secret key first from the dashboard, put it in `server/.env`.
3. In the Paystack dashboard, add a webhook pointing to:
   `https://your-deployed-api.com/api/payments/webhook`
   This is what confirms payment and triggers commission payout — it must
   be a real, publicly reachable URL (won't work on localhost without a
   tunnel like ngrok during testing).
4. Test with Paystack's test cards before going live.
5. Switch to your **live** secret key only once you've tested the full flow.

## Withdrawals — important
The `/api/payments/withdraw` route deducts from the member's wallet and
creates a `pending` payout record, but it does **not** yet send real money.
To actually pay members out, you need to:
1. Get your Paystack account approved for **Transfers** (business verification required).
2. Create a `transferrecipient` for the member's mobile money / bank account.
3. Call Paystack's `/transfer` endpoint with that recipient code.
4. Mark the payout `paid` once Paystack confirms.

This is left as a manual step because it requires your own approved
Paystack business account and each member's real payout details — plug it
into `server/routes/payments.js` once your Paystack account is enabled.

## Legal note
Multi-level commission structures are legal in many places when tied to
real products/services, but pure recruitment-based payouts (pay-to-join
schemes with no real product) can be classified as illegal pyramid schemes
depending on jurisdiction. Worth a quick check with a local lawyer before
launching for a client, especially once real money is involved.

## Deploying
- Backend: Render, Railway, or Fly.io (needs a persistent Postgres + long-running process)
- Frontend: Netlify or Vercel (same as your other WebHive projects)
- Database: Supabase, Neon, or Railway Postgres
