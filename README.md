# Nimbus — Parametric Climate Risk Protocol (MVP)

Complete implementation of the master design document.

## Features Implemented

- ✅ Full Anchor on-chain program (buy, settle, oracle posting, LP)
- ✅ Real Ed25519 signed quotes + transaction integration
- ✅ Next.js frontend with wallet connection
- ✅ Quote calculation + signed quote API
- ✅ Policy monitor job
- ✅ Postgres + TimescaleDB schema
- ✅ Oracle & policy API endpoints

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Build the program
anchor build

# 3. Start local validator + deploy
anchor localnet

# 4. Run frontend
npm run dev

# 5. Run monitor (in another terminal)
npx ts-node offchain/policy-monitor.ts

# 6. Run oracle aggregator
npx ts-node offchain/oracle-aggregator.ts
```

## Environment

Copy `.env.example` → `.env.local` and fill in keys.

## Testing

```bash
anchor test
```

## Architecture

- **On-chain**: `programs/nimbus`
- **Frontend**: `app/`
- **Off-chain services**: `offchain/`
- **Database**: `db/schema.sql`

See `master designdoc.md` for full specification.