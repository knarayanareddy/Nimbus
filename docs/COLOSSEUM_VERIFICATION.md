# Colosseum adaptation — observed verification and limitations

## Observed gates (12 October 2026)

| Check | Actual observed result |
|---|---|
| TypeScript unit/decoding/evidence/ingestion/transaction-builder tests | 62 passed, 0 failed |
| Inclusive comparator mutation | Replacing <= with < in isolated compiled output caused 3 actual boundary-test failures; restored evidence suite passed 20/20 |
| Rust host tests after settlement accounting integration | 12 passed, 0 failed (1 id + 3 inherited property + 8 new balance tests) |
| Next.js production build | Passed; original routes preserved plus Evidence Lab and three new evidence endpoints |
| ESLint / TypeScript | Passed |
| Desktop/mobile browser suite, local Node runtime | 10 passed, 0 failed, no retries |
| Same browser suite, local Cloudflare workerd runtime | 10 passed, 0 failed |
| Same browser suite, public Cloudflare Worker | 10 passed, 0 failed |
| Public live archive replay → independent CLI verification | Valid receipt; Nairobi Sept 1–14 inclusive readings, sum 460 hundredths of mm; hypothetical 500000000 test-USDC micro-units |
| Real Solana local-validator Memo | Sent, confirmed, exact parsed-transaction readback matched canonical receipt digest; proof in `docs/evidence/localnet-receipt-proof.json` |
| Devnet commitment attempt | Blocked: official faucet 429; no devnet transaction claimed |
| Full SBF program build | BLOCKED for deployment: stack-overflow/error diagnostics in CreatePool and Token-2022 code despite process exit 0 |
| Full Anchor validator buy→observe→settle integration | Not established; do not confuse host tests or Memo proof with this |
| Full npm dependency audit | 0 critical, 33 high, 15 moderate; retained high advisory chains remain |
| Authenticated Arena form / hackathon submission | Not accessed/submitted; user declined login flow |

## Exact public deployment readback
- Worker: `nimbus-worldsfair-2026`
- Public app: https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev/evidence
- Observed active version: `17dedd3a-64a6-4812-88ad-7a97b717339f` (wrangler deployment readback after a timed-out CLI).
- Initial version `bd93b89c-6e86-46bf-b2a6-99730078f6b0` was NOT a working deployment: every dynamic request returned Worker1101. Both local workerd and cloud logs identified `Unexpected loadManifest(/.next/server/preview-props.json)`.
- A reproducible narrow build patch adds that required Next16.4 manifest to OpenNext1.20.10's inlining glob. Local/remote browser suites then exercised the actual workflow. No permissive CSP or fake HTTP handler replaced the app.

## Defects actually addressed
1. Existing settlement transferred the payout but left recorded `Pool.capital` unchanged. The validated checked helper now decreases capital only for actual payouts and unlocks liability; changes share the transaction's atomic rollback.
2. Weather ingestion used an in-progress forecast and `null || 0`. The shared completed-day archive path now refuses missing/invalid/wrong-date/unit/grid data and does not post a fake drought observation.
3. Quote UI silently fabricated 23.63 on failure. It now reports a failed/invalid quote and does not advance to successful review.
4. Card decorative overlay intercepted real button clicks. It is pointer-transparent; no forced clicks were used to make the tests green.
5. Receipt import unmounted the result panel, collapsing page height while mobile was scrolled. It now retains the prior result while verifying, rejects failed imports, and breaks long digest/status words.
6. Original production CSP blocked framework inline hydration. Dynamic request nonces preserve a restricted script policy; tests validate nonce changes and working interactions. Exact vendor font domains are allowed for inherited wallet CSS.
7. Existing Next upgrade PR was reused then moved to 16.4.0 with regression checks; new artifacts do not imply all dependency vulnerabilities are gone.

## Still blocks real policy deployment or production use
- SBF stack diagnostics must be eliminated and the complete program loaded/exercised on a validator before policy deployment can be called ready.
- `buy_policy` lacks visible onchain validation for policy time alignment/duration against configured limits. Historical/backdated demo signing is not real risk-transfer issuance.
- Permissioned observation recording can accept negative/future values; settlement checks day identity and an upper publication bound but does not establish completed-day authenticity. The offchain path is safer, but onchain trust controls need a separate reviewed repair.
- The inherited quote signer accepts caller-provided economics; flat quote pricing is not actuarial. Public issuance is intentionally unconfigured and returns503, so no judge is invited to deposit real money.
- Switchboard V2 parser is an inherited manually offset-based path, not demonstrated decentralized weather-oracle operation. Do not market it as verified deployment.
- Existing stricter security workflows may remain red on high advisories. The new application gate is not an independent security audit or a substitute for that gate.
- Commercial weather-data licence, insurance/derivatives law, underwriting/reserves, farmer wallet/cash-out access and basis-risk validation remain unresolved.
- The repository's older executive summary and earlier event submission drafts describe past intended states. This document supersedes their readiness, timing and security claims.

## Reproducibility and truth boundaries
The captured sample is genuine retrieved data, not synthesized rainfall; unit test transport fixtures are synthetic and labelled. Receipt integrity is internally reproducible but does not authenticate the external provider or prevent a dishonest producer from creating a new self-consistent receipt. Historical replay is not a purchased policy and its displayed payout is not evidence of a transfer. Localnet transaction signatures are real but have no public devnet explorer verification. No mainnet wallet, real USDC, paid model or paid cloud-storage resource was used.

A finite test/rehearsal establishes observed behavior, not guaranteed future uptime. The presentation should include the captured sample plus the locally playable recording if the weather provider or public platform is unavailable.
