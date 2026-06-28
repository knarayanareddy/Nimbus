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
---

## Security & Developer Onboarding

**This project maintains a high security standard.** All contributions must pass our automated security gate.

### Security Gate (Mandatory)

Every commit and PR is automatically checked for:

- **A06** — High/critical dependency vulnerabilities (`npm audit --audit-level=high`)
- **A05** — Static export security headers
- **A09** — Linting and code quality
- **A02** — Secret detection

### Quick Setup (New Developers)

```bash
# 1. Install dependencies
npm install

# 2. Install pre-commit hooks (recommended)
pip install pre-commit
pre-commit install

# 3. Run the security gate manually
./scripts/security-gate.sh
```

### Available Security Commands

| Command                    | Description                              |
|---------------------------|------------------------------------------|
| `npm run security:audit`  | Run npm audit (moderate level)           |
| `npm run security:fix`    | Attempt automatic vulnerability fixes    |
| `./scripts/security-gate.sh` | Full local security gate             |
| `npm run build:static`    | Build for GitHub Pages + generate headers |

### CI / Automated Checks

- **Security Gate** — Runs on every push & PR
- **CodeQL Analysis** — Advanced SAST (JavaScript + Rust)
- **Semgrep** — OWASP Top 10 + secret scanning
- **Weekly Full Audit** — Every Monday at 09:00 UTC

### Pre-commit Hooks

After running `pre-commit install`, the following run automatically before every commit:
- Security gate
- npm audit (high/critical)
- Lint with zero warnings
- Secret scanning

### Reporting Security Issues

Please report vulnerabilities privately to the maintainers before public disclosure.

---

**Security is everyone's responsibility.** The gate is designed to be helpful, not blocking. If it fails, fix the issue and re-run.

