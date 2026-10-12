# Nimbus — Crypto World's Fair 2026 submission text

**Status:** submission materials prepared; no Arena form has been submitted.
**Chain selection:** **Solana** only.
**Current live demo:** https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev/evidence
**Repository branch:** https://github.com/knarayanareddy/Nimbus/tree/feat/colosseum-2026

## Project name
Nimbus — Verifiable Rainfall Evidence

## Short description
Replay historical rainfall, inspect every input, and independently verify a deterministic policy outcome. Export tamper-evident receipts and optionally anchor their digest on Solana devnet. Test-only climate-risk infrastructure.

## Problem and product
Parametric weather protection depends on a threshold and an external data source. Users may understand the headline payout but not which grid, day boundary, missing-data rule, unit conversion or oracle assumption produces it. A deterministic contract is not enough when its inputs and trust model are opaque.

Nimbus's new Evidence Lab makes that boundary inspectable. Select a region, completed historical UTC window, Sum/Mean/Max index and inclusive drought/excess-rain threshold. The app retrieves actual Open-Meteo ERA5 archive data, validates complete daily coverage, exposes raw readings and grid coordinates, computes the hypothetical result in fixed-point units, and exports a versioned canonical SHA-256 receipt. Independent CLI/server verification reconstructs the source-derived evidence and outcome; changed terms/readings or a re-hashed forged result are rejected. An explicit captured historical sample supports rehearsal/offline-source fallback; it never silently replaces a failed live fetch.

## Why Solana is useful here
The existing protocol is Anchor/SPL-token native. The new receipt path builds a signer-bound Solana Memo digest commitment and restricts browser execution to devnet by checking the genesis hash. A commitment records integrity and transaction timing, not weather truth, policy purchase or payout. A real local-validator Memo was confirmed and read back; its proof is committed. Public devnet funding was blocked by a 429 faucet, so this submission does not claim a devnet transaction or a publicly deployed new policy program.

## What is new during the event
- Wallet-free historical evidence/replay interface and real archive API integration.
- Complete-day/unit/grid validation, fixed-point replay and canonical receipt export.
- Independent receipt verification, including rejection of internally inconsistent forged outcomes.
- Devnet-only signer-bound Memo construction and fail-closed confirmation; real localnet transaction/readback evidence.
- Repaired pool capital accounting after triggered payouts, with eight new Rust regression tests.
- Replaced forecast/zero fallback in ingestion and fabricated UI premium fallback with explicit failures.
- Reused the existing event-period Next security migration, updated to 16.4.0 and rechecked dependencies; removed critical advisories, while disclosing remaining highs.
- Desktop/mobile browser gates, nonce CSP, corrected interactive overlays and import viewport stability.
- Boxed CreatePool validation wrappers to remove its owned SBF stack overflow, repaired the Quote IDL reference, and added real local-validator policy-flow evidence (separate synthetic/backdated mechanics tests, not historical coverage).
- Hosted an actual narrated demo, captions/player, seven-slide pitch and PDF; narration is generated product speech, not founder identity.
- A working cloud-hosted Next/API deployment, with a reproducible adapter compatibility repair and remote browser verification.

The exact diff and dates are in Git. Do not include earlier protocol features as newly built this week.

## Prior-development disclosure — use this verbatim unless facts change
Nimbus existed before Crypto World's Fair. The repository was created in May 2026 and already contained an Anchor rainfall-policy prototype, Next.js UI, signing/policy/settlement clients, a permissioned publisher, governance modules, tests and earlier design documents. It also contained Common S3nse adaptation/submission drafts and a pre-existing October 2 Next security-upgrade PR. The owner reports that Nimbus was never actually submitted to a hackathon; that is distinct from the presence of prepared submission materials. We are disclosing the existing work and asking judges to evaluate only the event-period changes visible in the adaptation branch. We do not claim the whole Nimbus protocol was built during this event.

## Competition and differentiation
Arbol already offers rainfall-trigger products and automatic calculated payouts. Etherisc documents blockchain crop protection and visible farmer payouts. Nexus Mutual covers listed Solana DeFi protocols, though not rainfall. Nimbus does not claim to be the first weather-insurance, blockchain-insurance or Solana-insurance product. Its narrow demonstrable distinction is an accessible replay/receipt workflow with explicit source and basis-risk disclosure around the Solana prototype. See `COLOSSEUM_RESEARCH.md` and the competitor report for sources and limits.

## Initial customer and business hypothesis
Initial target: climate-risk protocol developers and agricultural cooperatives/distributors evaluating understandable policy templates. Begin with unpaid design-partner interviews, field/grid basis-risk validation and externally reviewed historical cases. A possible later business is a paid integration/evidence-verification service for licensed risk carriers and distributors—not unlicensed direct-to-farmer insurance. USDC payout rails would require validated wallet/cash-out access, legal review, risk pricing/capacity and a complete program audit. No customer traction, revenue, market-size estimate, partnerships or funding are asserted here.

## Honest technical status
Observed: real historical data retrieval, fixed-point replay, exported receipt verification, walletless public workflow, local Memo confirmation/readback, 65 TypeScript unit tests, 6 adapter tests, 12 Rust host tests and desktop/mobile browser gates. A fresh local validator loaded the exact compiled Nimbus ELF and confirmed/read back 9 program-instruction transactions through initialize/create-pool/deposit/buy/observe/settle; actual test-token payout and no-payout paths match reserve/vault accounting. Three negative controls were rejected in validator preflight. Independent current-account snapshots verify final balances. These use synthetic observations and backdated test windows, not real coverage or authenticated ERA5 payouts. Hosted policy issuance is intentionally not configured.
Not claimed: production insurance, independent weather authenticity, validated premiums, a complete protocol audit, public devnet policy deployment or mainnet deployment. CreatePool’s stack diagnostic is fixed and its runtime path is tested; Token-2022 dependency diagnostics still occur despite SBF exit 0. Full dependency audit has 0 critical, 23 high and 15 moderate advisories. Historical Evidence Lab payouts remain hypothetical; the separate localnet test-token transfers do not establish coverage.

**Hosted materials:** [new continuous playthrough](https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev/clima-protect-demo.html) · [new narrated MP4](https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev/clima-protect-demo-v2.mp4) · [pitch slides](https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev/nimbus-pitch.html) · [PDF](https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev/nimbus-pitch.pdf) · [SRT](https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev/clima-protect-demo-v2.srt). The112-second browser playthrough uses neural ElevenLabs product narration, real interactions and30 English caption cues. Prior recordings remain archived. The current voice/story script supersedes the initial shot list below; see `docs/media/demo-v2-narration.json` and `docs/media/README.md`.

## Entrant-owned fields still required
- Your actual registered team/member names, bios and location; confirm age/jurisdiction/funding eligibility.
- Enter the verified hosted product-demo URL, and record/upload a separate personal founder presentation if required. If the form restricts video hosts (e.g. YouTube/Vimeo), upload the supplied MP4/SRT there; the authenticated restriction was not read back. The user explicitly chose to handle Arena editing/submission.
- Logo/graphic if the form requires it; the repository contains the prepared Nimbus SVG.
- Verify exact authenticated Arena field/video limits; public FAQ guidance is not a readback of the form.
- Submit through your Colosseum account before the controlling rules deadline (October 12, 2026 23:59 PT / October 13 08:59 CEST).

## Two-minute demo narration / shot list
1. **0:00–0:20 — Problem.** “A deterministic climate contract is only understandable if we can inspect its weather inputs. Nimbus makes that evidence boundary visible—not just a weather-themed payout button.” Show the historical/test-only warning.
2. **0:20–0:45 — Real source.** Show Nairobi, September 1–15 exclusive, ERA5, UTC, Sum and <=80mm. Replay live or explicitly select the captured sample. Name the provenance mode on screen.
3. **0:45–1:10 — Inspect calculation.** Show all daily readings and the 4.60mm aggregate, queried/grid coordinates and source URL. Explain that 500 test-USDC is a hypothetical triggered result, not a purchase or received payment.
4. **1:10–1:35 — Export and verify.** Download/import the receipt; show success. Change the result in a JSON copy; show rejection even if the forged receipt is re-hashed. Explain integrity versus weather authenticity.
5. **1:35–1:50 — Solana proof.** Show the real committed localnet transaction proof. Say clearly “local validator”, not “devnet” or “payout”. The devnet button remains a funded-wallet option, with the blocked faucet disclosed.
6. **1:50–2:10 — Close.** “The new work is a working evidence/replay interface, verifier, Solana commitment path and accounting repair. The inherited policy protocol is disclosed separately; audits, production oracle/distribution and real coverage are next-stage work.”
