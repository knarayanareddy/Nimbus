# Nimbus — remediation plan

All actions are planned, not executed. No mainnet transaction is authorized by this plan. Keep financial and legal acceptance separate from technical test results.

## P0 — baseline and feasibility
Entry: owner approves isolated localnet/devnet access and test keys. Exit: verified architecture and threat model. **NIM-T1** (NIM-3/NIM-4; observed `README.md`, `programs/nimbus/Cargo.toml`, `package.json`).
1. Inventory on-chain instructions, oracle/quote validation, token accounts, signers, authority and upgrade paths; distinguish source from deployed state.
2. Reconcile the old blockers document against the current pinned revision, deployed program ID and actual pricing; identify economic and legal assumptions needing independent review.
3. Reproduce documented build/test steps only in an isolated approved environment and record exact versions, failures, and chain state without using real funds.
Deliverable: evidence-backed call and authority map. Verify deployment identifiers and authority directly against the selected network. DoD: [ ] trust boundaries traced; [ ] pricing status established; [ ] owner approves network and keys.

## P1 — authenticated service correctness
Entry: T1 completed; verifier callers, accepted signature format and a non-production secret-management path are identified in the approved test environment. Exit: malformed requests reject predictably and test failures are meaningful. **NIM-T2** (NIM-1; after T1; observed `offchain/service-auth.ts`; proposed service integration tests).
1. Inspect all verifier callers and define malformed signature status, logging and maximum input size.
2. Validate canonical signature encoding and expected length before constant-time comparison; avoid logging secret or raw authentication material.
3. Test valid, wrong, empty, malformed and oversized signatures through the public service boundary, and test replay semantics against the actual protocol.
Deliverable: verifier and integration regression. Verify a deliberately broken signature check makes a negative test fail and malformed inputs never crash the process. DoD: [ ] malformed input rejected; [ ] comparison still constant-time for valid-length bytes; [ ] mutation detected.

## P2 — quota and signing boundary
Entry: T1 completed; the actual signing route, deployment topology and trusted proxy/IP model to be tested are identified. Exit: cross-instance abuse and key exposure have explicit controls. **NIM-T3** (NIM-2; after T1; observed `app/api/quotes/sign/middleware.ts`; proposed shared limiter and route tests).
1. Trace whether middleware runs for the deployed signing endpoint and define trusted proxy/IP and authenticated actor boundaries.
2. Choose a bounded shared limiter or approved edge control with expiry, retry behavior, multi-instance semantics and fail-closed policy for the signing operation.
3. Exercise multi-instance bursts, unknown/spoofed addresses, expiry, dependency outage and signing authorization; assess quote freshness and replay protections separately.
Deliverable: deployable rate policy and attack-oriented tests. Verify a deliberately disconnected limiter cannot silently permit signing and inspect actual 429 behavior. DoD: [ ] distributed limits observed; [ ] store bounded; [ ] signing keys remain inaccessible to clients and logs.

## P3 — financial invariants, release and UX
Entry: T2 and T3 complete; owner approves isolated localnet/devnet rehearsal scope, authority holders and the acceptance evidence required for release decisions. Exit: independent domain and operational acceptance. **NIM-T4** (preventive requirements; after T2/T3; observed `tests/deserialize.test.ts`, workflows and README; proposed integration tests and operator runbook).
1. Create adversarial localnet tests for wrong owner/discriminator, unauthorized upgrades, oracle expiry, settlement replay, vault balance conservation and rounding; derive expected results independently from the implementation.
2. Rehearse key rotation, upgrade and rollback, signed immutable artifact provenance, service recovery and restore of off-chain records; record actual network and authority observations.
3. Review insurance terms and economic model with qualified owners; test accessible wallet flows, denied signatures, incorrect networks, loss scenarios and understandable quote/payout disclosures.
Deliverable: independent risk register, verified localnet results and recovery record. Verify each invariant test fails when its specific guard is deliberately bypassed; do not weaken thresholds to make a release green. DoD: [ ] negative controls fail as intended; [ ] recovery observed; [ ] domain and accessibility reviews recorded.

## Dependencies and release policy
T1 → T2/T3 → T4. Independent reviewer inspects the release SHA, test mutations and deployed authority state. Acceptance: [ ] no unknown program ID; [ ] tested signature and quota boundaries; [ ] oracle and fund invariants reviewed; [ ] keys and upgrades controlled; [ ] recovery observed; [ ] user and legal approval obtained. Owner approval is mandatory for network selection, funds, key custody, deployment and irreversible upgrades. Roll back off-chain artifacts to a verified prior build; on-chain rollback requires the approved upgrade authority and migration strategy and may be impossible for already-settled transactions. Pause issuance on uncertainty and follow the incident plan.
