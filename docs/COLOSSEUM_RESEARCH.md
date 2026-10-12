# Nimbus: hackathon and competitor decision brief

**Snapshot:** 12 October 2026. **Method:** primary Colosseum rules/FAQ/resources; vendor product documentation; direct source/API and repository inspection. Vendor marketing is evidence of what is offered, not independent proof of policy volume, payout speed, solvency or uptime.

## Executive decision
Select **Solana only**. Preserve the existing Anchor/client foundation, but change the pitch from generic automatic crop insurance to **inspectable rainfall evidence and deterministic policy replay**, with optional Solana devnet Memo digest commitments. This is an implementation distinction, not a claim to be first or to prove weather truth. Keep all funds/test policies off mainnet.

## Current event and eligibility
The current event is Crypto World's Fair, an open competition across crypto ecosystems.[4] Its legal rules specify a contest period starting 6:00am PT September 14, 2026 and ending 11:59pm PT October 12, 2026.[7] That converts to October 13 at 08:59 CEST (calculated with Python zoneinfo, not inferred from the date).

Colosseum explicitly permits pre-existing code with disclosure: “Builders may use pre-existing code, but teams must disclose all relevant past development work in the submission form.”[5] The same FAQ says only work between the competition start/end is judged.[5] Nimbus was created before this event and includes a prior Common S3nse adaptation/submission draft; those facts must be disclosed even though the owner says it was never submitted. Lack of prior submission is user-reported, not independently certified. Personal/jurisdiction/funding eligibility and the authenticated form's exact requirements remain entrant responsibilities.

## Competitive reality
Arbol is the closest direct commercial comparator: its rainfall product describes threshold selection and automatic calculated payouts for drought/excess-rain structures.[9]
Etherisc documents crop protection and historical farmer payouts visible onchain.[10]
These precedents defeat claims that blockchain, rainfall thresholds or automatic weather payouts are novel.[9][10]
Nexus Mutual also says its first public Solana listings are live for Kamino, Raydium, Orca and Jupiter, but this is DeFi protocol-risk cover rather than rainfall protection.[11]
Nimbus must not claim “first insurance on Solana.”[11]

Broader alternatives researched include Swiss Re agricultural parametric products, Descartes excess-precipitation insurance, ACRE Africa index microinsurance and the UN CTCN Thailand blockchain feasibility/pilot-design project. Their respective status/capabilities are documented in the companion competitor report; a pilot design is not proof of paid live policies. No credible “nobody has built this” claim is supported by this search.

## Useful differentiated slice
The new judged work exposes the exact region/grid coordinates, completed UTC range, model, raw daily values, unit conversions, inclusive trigger semantics and hypothetical payout. A canonical export and independent verifier reject changed terms/readings/results, even if someone re-hashes a forged result. A Memo records the digest and signer; it is neither oracle authentication nor proof of an actual USDC payout. This is intended initially for protocol developers and cooperative/distributor pilots that need understandable policy terms—not an unvalidated promise to replace insurance distribution.

Open-Meteo's historical documentation recommends ERA5/ERA5-Land for consistent multidecade data.[8] The chosen receipt path pins ERA5, refuses incomplete/invalid days, and labels the captured sample separately. ERA5 is gridded reanalysis; a correct replay can still differ from rainfall on a farm. Historical trigger frequency is not an actuarial premium or crop-loss estimate. Commercial weather-data licensing and insurance/derivatives regulation require review before real launch.

## Chain comparison and rejected routes
| Candidate | Decision for this entry |
|---|---|
| Solana | Chosen: existing Anchor, SPL token and wallet code; real receipt Memo instruction and tested replay/verification path. |
| Base / Arbitrum / Ethereum L1 | No evidenced EVM counterparty need justifies a rewrite or duplicate contract/oracle/liquidity stack before the deadline. |
| Tempo | Payment focus alone is not a climate-data or distribution advantage; do not add an unverified integration for a checkbox. |
| Zcash | Privacy is a possible later requirement; no demonstrated programmable stablecoin rainfall-settlement path in this build. |
| Hyperliquid | No validated exchange/trading integration or customer requirement. |
| Robinhood Chain | No verified distribution partnership or audience requirement. |

These are engineering scope decisions, not assertions that rejected chains cannot support such a product. Revisit when a buyer, distributor or treasury counterparty supplies a concrete requirement and an executable stablecoin/oracle/wallet test plan.

## Execution and remaining limits
A real historical archive was fetched and replayed (Nairobi September 1–14: 460 hundredths of mm). The application has unit, HTTP, browser and Rust host gates. A real local-validator Memo proof is retained under `docs/evidence/`; it is explicitly not a public devnet transaction. The devnet faucet returned 429. Full policy validator deployment remains blocked by SBF stack diagnostics and missing prior protocol deployment evidence. Permissioned publisher trust, inherited quote/time validation and vendor parser assumptions need further security work before any real-fund use. No fundraise, user traction, regulatory approval or independent audit is claimed.

## Research artifacts
Detailed competitor report and official-rule report are retained in the local research directory `/Users/brightech/Documents/Nimbus_Research_20261012/`. Its ledger, source captures, exact quotes and baseline/adaptation audit outputs are evidence artifacts; current submission text distinguishes old and new work. The public app's runtime result must be checked separately from a successful deployment command.

## Historical source attributions and registration

The new synthesis uses its own source ledger; companion competitor/rules reports retain independent numbered bibliographies. Do not mix their source numbers. The complete quoted source texts, current legal rules, baseline audit and public runtime receipts are retained in the local research directory. Public vendor claims are attributed rather than treated as independent sales/performance evidence.

## Sources

[4] https://colosseum.com/worldsfair — Crypto World's Fair Hackathon - Colosseum
[5] https://colosseum.com/hackathon — Hackathon - Colosseum
[7] https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf
[8] https://open-meteo.com/en/docs/historical-weather-api — 🏛️ Historical Weather API | Open-Meteo.com
[9] https://www.arbol.io/products/rainfall-risk-solutions — Rainfall Risk Solutions
[10] https://etherisc.com/about — About | Etherisc
[11] https://nexusmutual.io/blog/solana-youre-covered — Solana, You're Covered | Nexus Mutual
