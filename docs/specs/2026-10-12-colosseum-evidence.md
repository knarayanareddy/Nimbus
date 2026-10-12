# Nimbus — verifiable rainfall evidence adaptation

**Status:** implemented (test-only evidence scope; devnet funding blocked and inherited full policy deployment unverified)
**Owner:** Hermes / knarayanareddy
**Date:** 2026-10-12

## Problem and observed baseline
Nimbus already implements a Solana rainfall policy prototype. Generic weather-triggered insurance is not novel (Arbol, Etherisc); the defensible new slice is a usable independently replayable evidence workflow. Existing `settle_policy` pays SPL tokens but never decrements `Pool.capital` (lib.rs:590-613). Its weather publisher treats absent/null precipitation as zero and uses today's forecast as an observation. The frontend's quote calculation silently fabricates 23.63 on failure. Baseline: lint/typecheck/build pass after `npm ci --include=dev`; 35 decoding tests pass; full audit 29 high / 1 critical. Rust/Solana/Anchor absent. Existing Next migration PR #15 will be reused, not merged into main.

## Constraints and clock
Current Crypto World's Fair rules: Sept 14–Oct 12 2026, closes 23:59 PT (Oct 13 08:59 Europe/Amsterdam). Pre-existing work must be disclosed; only in-period work judged. User approved test-only funds, existing-account hosting, and framework upgrade with regression checks. Main branch stays untouched. No submission-form completion, real-money coverage, new paid plan or hosted inference.
Build cutoff: Oct 12 20:00 CEST. Gate checkpoint: 17:30. Feature freeze: 19:00. Preserve remaining time for deployment, demo/video and honest submission.

## Approach
Keep Solana and the existing Anchor/TypeScript/wallet stack. Add an Evidence Lab that fetches completed historical daily ERA5 reanalysis from Open-Meteo, validates date completeness and units, replays the existing inclusive trigger semantics in integer hundredths of mm, and exports a canonical SHA-256 receipt. A devnet Solana Memo commits the digest; it proves receipt integrity/timestamp, NOT weather truth, payout, or purchase-time commitment. Provide a recorded genuine historical sample as an explicit offline fallback, never silently substitute sample data for live calls. Connect the resulting settings to the inherited buy flow, which remains a separate test-only protocol path.
Fix paid settlement reserve bookkeeping and fail-closed weather handling, with real deterministic tests. Reuse PR #15's framework migration, correct runnable scripts, preserve all existing routes. Distinguish the new functional evidence slice from inherited unverified Anchor deployment.

## Non-goals
No regulated insurance offer, actuarially validated premium, decentralized weather oracle, yield/crop-loss measurement, guaranteed farmer distribution, production liquidity, bridge, added chain, mainnet transaction, hidden backdating or fabricated settlement signatures. Historical replay is not a purchased policy or a risk-price estimate.

## Acceptance criteria / gates
- [x] Completed historical range (1–31 days, UTC exclusive end) returns exact daily readings, provider/model/units/grid coordinates/provenance; invalid region/dates/enums/missing/null/duplicate/negative values fail closed (unit + HTTP tests).
- [x] Sum, truncated integer mean and max match Anchor inclusive <= / >= trigger semantics at threshold-1 / threshold / threshold+1 (unit tests).
- [x] A canonical receipt includes input terms, validated observations, model/units/source URL, result and version; changing one term/reading changes digest. `verify:receipt` rejects tampering (unit + CLI tests).
- [x] `/evidence` works without wallet and displays historical-only warning, raw days, deterministic payout, source link, digest, export, explicit cached sample fallback and buy-settings link (Playwright desktop/mobile tests).
- [x] Devnet Memo transaction builder binds the receipt digest and connected signer; mainnet refused; UI never reports a confirmation when RPC says error. Exercise a real devnet transaction if faucet/account funding is available; otherwise mark the live hop blocked.
- [x] Rust settlement helper decreases capital on payout and unlocks maximum liability once, rejects underflow/insolvency, preserving paid/no-trigger invariant (real `rustc --test` and source integration review; full Anchor suite separately recorded).
- [x] Existing quote/weather failure paths show an error rather than inventing premium/rainfall (unit/HTTP/browser checks).
- [x] `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build`, `npm run test:e2e` pass; all baseline routes remain; `npm audit --include=dev` has zero criticals (high advisories separately reported, not called clean).
- [x] README + current-event submission + provenance disclosure + 2–3 minute pitch/demo script document only exercised features, competitors, basis risk, oracle trust and remaining deployment/submission requirements.
- [x] Public-hosted evidence path verified if an authorized existing account is available; otherwise exact deployable artifact/runbook and explicit blocker, never call a tunnel permanent hosting.

## Demo path (under two minutes)
1. Open Evidence Lab; note historical/test-only label.
2. Run Nairobi Sept 1–15 historical replay with Sum, <=80mm, 500 test-USDC.
3. Inspect source/model/daily readings and inclusive threshold result; change threshold to flip result.
4. Download receipt; run receipt verification; alter one reading and show rejection.
5. Connect devnet wallet to anchor receipt hash, if funded; show actual explorer confirmation, not a fake placeholder.
6. Show disclosed inherited code/new-work delta and deployment limitations.

## Open questions
Authenticated Arena form is unavailable after user declined login; exact form-specific requirements/team details remain user-owned. Public rules/FAQ allow disclosed pre-existing code but do not certify entrant eligibility. Hosting auth, devnet funding, actual inherited Anchor compilation/deployment remain evidence-dependent.

## Rollout / rollback
Changes isolated on `feat/colosseum-2026` with explicit prior baseline SHA `2abc6d726f72ccb9629260836055aa930e35d0c3`. Candidate worktrees reviewed before integration; no main merge. Revert adaptation commits to restore baseline. Receipt schema is versioned; no migration of real policy funds or data.
