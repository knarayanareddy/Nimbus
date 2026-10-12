# Colosseum adaptation — observed verification and limitations

## Observed gates (12 October 2026)

| Check | Actual observed result |
|---|---|
| OpenNext compatibility patch regression | 6 passed, 0 failed; pre-fix run had 4 failures proving missing version/ambiguity guards; mismatched/already-patched/missing/changed/ambiguous package inputs now fail closed without writes |
| TypeScript unit/decoding/evidence/ingestion/transaction-builder/IDL tests | 65 passed, 0 failed; 3 real Anchor-coder tests failed before the one-line Quote IDL fix |
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
| SBF program build | Owned CreatePool overflow removed by five boxed wrappers; host tests pass and exact ELF executed on a validator. Ten Token-2022 dependency diagnostics remain despite exit 0; a clean full-build/security claim is NOT made |
| Actual Nimbus program on fresh local validator | 9 confirmed/read-back instruction transactions: init, pool, deposit, nonce, 2 buys, observation, payout and no-payout settlements; 3 intended negative controls rejected in preflight. Synthetic/backdated fixture, NOT risk-transfer issuance |
| Independent later account/binary readback | 7 public account snapshots matched final vault/capital/owner/treasury balances and policy statuses; loaded ProgramData ELF matched SHA-256 a3cff4d3ed5f84871db028313549a1dbbd8333fc228a6b800922658421aaa1d0 |
| Clean-checkout reproduction | Fresh npm ci patched the pinned adapter; 62 unit tests, build, lint/typecheck and 10 browser flows passed |
| GitHub Actions on application-source commit | Application and rust-host jobs succeeded in run `38255954305`; this gates critical advisories only, not all high advisories |
| Narrated MP4 / YouTube format check | 137.23s, 1280×720, 30fps H.264, AAC stereo 48kHz, English subtitle track, -14.0 LUFS; 0 failed checks, 0 warnings. Generated product voice, not founder identity |
| Full npm dependency audit | Baseline 0 critical / 33 high / 15 moderate → 0 critical / 23 high / 15 moderate after scoped Wrangler/glob/serializer fixes; remaining advisory chains are not cleared |
| Authenticated Arena form / hackathon submission | Signed-in editor tab identified; DOM automation remained disabled. No fields changed/submission made. User explicitly chose to handle Arena editing and final submission |

## Exact public deployment readback
- Worker: `nimbus-worldsfair-2026`
- Latest closure version: `026a0ab8-6aaa-4367-ad28-6912ddb579ad`, independently read back at 100% traffic; 10 Evidence Lab flows, 2 actual narrated-media playback viewports, 14 pitch-layout states and 7-page PDF verified. Six hosted artifact bodies matched local files exactly (HTML follows the observed same-host 307 extensionless redirect); `docs/evidence/closure-release.json` records sizes/digests and limitations.
- Public app: https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev/evidence
- Previous verified application version: `0d8e1363-d5ce-4c50-8b93-8e12cec50439`, at 100% traffic after a successful deploy and separate deployment-list readback. All 10 strengthened remote desktop/mobile flows and fresh live archive receipt verification passed on this version, including actual exported receipt integrity and delayed cleanup. Subsequent closure release adds hosted assets, tested dependency repairs, valid Quote IDL transport and local program evidence; final release readback is retained separately.
- Previous working version `b3aaca37-4c3c-463a-aa3d-e49d29b2ecb0` passed the logo HTTP fetch and original 10 remote flows before the bounded review follow-up.
- Previous application checkpoint `f65e78a4419ff53f6794f77c0bd98323cba5d3ed` passed both application and Rust host jobs in GitHub Actions run `38255954305`. The subsequent bounded review fix adds an explicit adapter guard and deferred receipt-download cleanup with regression gates.
- Intermediate working version `17dedd3a-64a6-4812-88ad-7a97b717339f` was confirmed via deployment readback after a timed-out CLI.
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

## Final technical closure
The user requested hosted materials and bounded blocker work, then chose to handle Arena editing/submission. Wrangler 4.149.0 plus targeted glob10/serializer pins reduced npm high advisories 33→23 without changing the application framework or downgrading its newer glob13. Build, types/lint, 65 unit tests, 6 adapter tests and browser gates passed. Five CreatePool wrappers are boxed; normalized account constraints/order/types and stored account schemas are unchanged. Its owned SBF diagnostic disappeared and 12 host tests passed. Actual program flow and final balance/binary readback are described below; this is not a clean full-SBF or production-readiness claim. Three real Anchor-coder tests exposed the malformed Quote type reference; all failed before the one-line fix and pass after it. Their new source file was explicitly registered in the unit compiler include list, rather than claiming a test that never ran.

Hosted materials comprise the real narrated 137-second recording, retained silent original, SRT/WebVTT player, fixed-stage 7-slide pitch and PDF. The native voice is labelled synthetic product narration. Fourteen desktop/mobile slide-layout states were exercised; PDF export explicitly restores hidden title animation states for print. No founder identity, traction or eligibility was invented.

## Bounded late-review follow-up
A read-only delegated review identified a real missing installed-version check in the OpenNext patch and a possible browser URL-revocation race (not reproduced as a failed user download). The patch now checks exact `1.20.10` metadata before both modification and idempotent acceptance, and rejects ambiguous source patterns. Six tests execute the real script on isolated synthetic package trees; four failed before the repair and all six passed after it.

Receipt export now attaches a hidden download link and delays URL/link cleanup for 60 seconds. Desktop/mobile Chromium tests verify the actual downloaded file, canonical receipt digest and filename, then use a virtual clock to assert the real cleanup callback runs. An initial test-only blob fetch was blocked by existing `connect-src`; that invalid probe was replaced with cleanup observation, not a relaxed CSP. No cross-browser/Safari certification or comprehensive audit is claimed.

## Still blocks real policy deployment or production use
- The owned CreatePool diagnostic and exercised local flow are repaired/verified; remaining Token-2022 diagnostics and untested protocol paths still prevent a clean-build/audit or production-ready claim. Absence of names in the stripped ELF symbol table does not establish dead-code safety.
- `buy_policy` lacks visible onchain validation for policy time alignment/duration against configured limits. Historical/backdated demo signing is not real risk-transfer issuance.
- Permissioned observation recording can accept negative/future values; settlement checks day identity and an upper publication bound but does not establish completed-day authenticity. The offchain path is safer, but onchain trust controls need a separate reviewed repair.
- The inherited quote signer accepts caller-provided economics; flat quote pricing is not actuarial. Public issuance is intentionally unconfigured and returns503, so no judge is invited to deposit real money.
- Switchboard V2 parser is an inherited manually offset-based path, not demonstrated decentralized weather-oracle operation. Do not market it as verified deployment.
- Existing stricter security workflows may remain red on high advisories. The new application gate is not an independent security audit or a substitute for that gate.
- Commercial weather-data licence, insurance/derivatives law, underwriting/reserves, farmer wallet/cash-out access and basis-risk validation remain unresolved.
- The repository's older executive summary and earlier event submission drafts describe past intended states. This document supersedes their readiness, timing and security claims.

## Local-policy execution and archival boundary

The source-verified raw ABI harness in `scripts/localnet-policy-proof.ts` uses the real Quote serializer, Ed25519 verification instruction and actual SPL operations; it does not invent a complete generated IDL. `localnet-policy-proof.json` records the 9 successful immediate transaction readbacks/logs and 3 expected preflight rejections. A later historical RPC lookup returned null despite the same genesis, so it is not claimed as an independently retrievable public transaction archive. `localnet-policy-account-readback.json` independently captures 7 current accounts and validates policy statuses, final balances and the exact loaded ELF. Reproduce on a fresh task-owned ledger; never reset existing user data.

## Reproducibility and truth boundaries
The captured sample is genuine retrieved data, not synthesized rainfall; unit test transport fixtures are synthetic and labelled. Receipt integrity is internally reproducible but does not authenticate the external provider or prevent a dishonest producer from creating a new self-consistent receipt. Historical replay is not a purchased policy and its displayed payout is not evidence of a transfer. Localnet transaction signatures are real but have no public devnet explorer verification. No mainnet wallet or real USDC was used; no hosted inference service, paid cloud-storage resource or new paid plan was provisioned for the app.

A finite test/rehearsal establishes observed behavior, not guaranteed future uptime. The presentation should include the captured sample plus the locally playable recording if the weather provider or public platform is unavailable.
