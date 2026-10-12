# Nimbus — Verifiable Rainfall Evidence on Solana

**Crypto World's Fair 2026 adaptation · test-only prototype.**

**Live Evidence Lab:** https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev/evidence

Nimbus makes rainfall-policy outcomes inspectable: choose a completed historical UTC window, fetch ERA5 reanalysis, see every daily reading, replay the existing inclusive threshold logic, and export a canonical SHA-256 receipt. A separate verifier rejects altered inputs or a forged result, including when it has been re-hashed. Optional Solana **devnet Memo anchoring** commits the digest—not weather authenticity, purchased coverage or a USDC payout.

This is not a first-ever parametric insurance product: Arbol and Etherisc are clear precedents. The narrow new contribution is a usable evidence/replay workflow around the inherited Solana prototype. See [research](docs/COLOSSEUM_RESEARCH.md), [submission](docs/COLOSSEUM_SUBMISSION.md), and [verification/limits](docs/COLOSSEUM_VERIFICATION.md).

**Recorded demo:** [137-second MP4](docs/media/nimbus-demo.mp4), with default selectable English captions and [SRT](docs/media/nimbus-demo_adjusted.srt). No voice track; upload the subtitles on the chosen video host. [Recording notes](docs/media/README.md).

## Quick start — no wallet or API keys

Use Node.js **22+** and npm. The pinned Next.js version accepts React 18; retained web3.js is intentional compatibility with the inherited Anchor/client code.

```sh
npm ci --include=dev
npm run dev
```

Open http://localhost:3000/evidence. Use the default Nairobi September 1–15 exclusive window. **Replay historical rainfall** calls the actual archive API. **Load captured sample** explicitly uses a genuine recorded archive and labels it; there is no silent mock/zero/forecast fallback. A wallet is not required to inspect, export or verify a receipt.

### Receipt verification

Download a receipt from the app, or use the committed captured sample:

```sh
npm run verify:receipt -- docs/evidence/sample-receipt.json
```

A changed result/reading/term is rejected. This checks internal integrity, region consistency and deterministic replay; anyone can fabricate a wholly new internally consistent receipt, so this is **not independent weather authentication**. Source evidence remains a provider trust assumption.

## Gates exercised

```sh
npm run lint
npm run test:unit       # 62 tests (includes 35 inherited decoding tests)
npm run build
npm run typecheck
npm run test:e2e        # 10 desktop/mobile flows; zero retries
npm run test:rust       # 12 Rust host tests; NOT validator integration tests
```

To exercise the same flows against the published Worker:

```sh
NIMBUS_BASE_URL=https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev npm run test:e2e
```

All 10 remote flows were observed passing, and a fresh live archive receipt from the public API was verified independently via the CLI. Tests do not manufacture live weather; synthetic fixtures are labelled in unit-test source.

## What is on Solana?

The retained Anchor program contains policy/pool/nonce and settlement instructions. This adaptation repairs pool capital accounting when a payout occurs, with eight new checked-balance regressions. The new receipt commitment uses the deployed Solana Memo program and a connected signer; frontend anchoring refuses non-devnet genesis hashes.

A **real local Solana validator Memo transaction** was sent, confirmed and read back exactly. Its proof is [localnet-receipt-proof.json](docs/evidence/localnet-receipt-proof.json). **It is not a devnet transaction, deployed Nimbus policy, purchase or token payout.** The public faucet returned 429, so no devnet commitment is claimed.

To reproduce that local proof, install the Solana CLI using its [official manual guide](https://solana.com/docs/intro/installation/dependencies), then use two terminals:

```sh
# A fresh task-owned ledger; default binding is loopback. Do not reset a user's existing ledger.
solana-test-validator --ledger .anchor/receipt-demo --rpc-port 18999 --faucet-port 19010 --dynamic-port-range 21000-21040 --bind-address 127.0.0.1
# Second terminal; creates only an ignored, generated test wallet.
npx --no-install ts-node --project tsconfig.offchain.json scripts/localnet-receipt.ts
```

**Do not deploy the inherited policy program with real funds.** The attempted SBF build emitted stack-limit diagnostics (including `CreatePool` and Token-2022 dependencies) despite an exit code of zero. Full Anchor validator buy→settle integration has not been established. The public quote-signing handler intentionally returns 503 when no quote signer is configured; the hosted demo has no signer secrets, live underwriting capital or policy issuance.

## Architecture

| Layer | Location |
|---|---|
| Historical evidence, canonical hashing and replay | `lib/evidence.ts` |
| Bounded replay / sample / verification endpoints | `app/api/evidence/` |
| No-wallet user workflow | `app/evidence/page.tsx` |
| Devnet-only Memo builder and confirmation | `lib/receipt-anchor.ts` |
| Captured genuine ERA5 archive | `data/colosseum/nairobi-archive.json` |
| Fail-closed completed-day ingestion | `lib/weather-observation.ts` |
| Inherited Anchor program + repaired accounting | `programs/nimbus/` |
| Browser and unit regression gates | `tests/`, `playwright.config.ts` |

Dates are UTC midnight-aligned; the end is **exclusive**. Sum/Max and truncated integer Mean use hundredths of mm. Trigger enum names `LT`/`GT` preserve the inherited contract's **inclusive** `<=`/`>=` semantics. Payout arithmetic uses 6-decimal test-USDC base units. Historical replay never transfers tokens or backdates a purchase.

## Cloudflare deployment

The current app retains actual Next server/API behavior via pinned OpenNext and Workers; it is not a screenshot companion or laptop tunnel.

```sh
npm run build:cloudflare
npm run cf:typegen
npm run preview:cloudflare
npm run deploy:cloudflare
```

`wrangler.jsonc` targets the owner's existing account and a distinct Worker `nimbus-worldsfair-2026`. Change the non-secret account/Worker identifiers before deploying to your own account. Do not copy credentials into source or browser bundles. No R2/D1 resource or paid plan is provisioned.

`build:cloudflare` applies a narrow, version-checked compatibility patch: OpenNext 1.20.10 omitted Next 16.4's required `preview-props.json`, producing Worker 1101. The patch expands the manifest glob, is idempotent, and fails if upstream code changes. A fresh checkout therefore preserves the observed fix. Fresh CSP nonces use dynamic rendering; arbitrary inline script is not allowed. Retained edge middleware is deliberate OpenNext compatibility and produces a Next deprecation warning.

## Honest limits

- **No real coverage/insurance, underwriting, audit, compliance approval or actuarial pricing claim.** Existing flat demo pricing is not risk-based pricing.
- **Basis risk:** a reanalysis grid is not rainfall or crop loss at a particular field. Historical windows can be selected with hindsight; this lab is not a valid purchased risk-transfer policy.
- **Trust:** the weather provider and permissioned publisher remain trusted. A Memo's integrity/timestamp does not establish correct meteorology or immutable purchase-time terms.
- **Data:** archive publication lag is enforced; missing/null/negative/duplicate/out-of-order/wrong-unit data fails closed. Commercial weather-data use requires licence review.
- **Dependencies:** final full audit recorded **0 critical, 33 high, 15 moderate** advisories. High advisory chains remain, including legacy Solana and tooling dependencies; the original stricter security gate may therefore fail. Do not interpret a green application gate as all-clear security.
- **Deployment:** hosted replay/verification works without secrets; the inherited policy deployment remains blocked/unverified. No mainnet funds were touched.
- **Hackathon:** pre-existing work must be disclosed; only event-period work is judged. This repository is not proof of personal/legal/funding eligibility, and the actual Arena submission/video hosting remain separate entrant actions.

The original protocol and design documents remain for context; older “production-grade”, automatic settlement and decentralization claims are superseded by the current verification/limitations document.
