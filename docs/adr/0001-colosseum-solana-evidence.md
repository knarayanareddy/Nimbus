# 0001. Solana-only evidence replay, not another generic insurance pitch

- **Status:** accepted
- **Date:** 2026-10-12
- **Deciders:** knarayanareddy / Hermes

## Context
Nimbus has an Anchor Solana program, SPL-token policy pools, Next.js frontend and permissioned Open-Meteo publisher. The current Crypto World's Fair spans eight ecosystems, but allows choosing a single chain. Arbol and Etherisc already document parametric weather protection and automatic/onchain payouts. The event closes October 12 at 23:59 PT. The user approved test-only funds and verified dependency upgrades. Sources: `../../` research report outside repo; public URLs in submission/research docs.

## Decision
Keep Solana and existing wallet/Anchor compatibility. Build the new judged slice as an inspectable historical rainfall Evidence Lab, with pure integer replay, explicit data lineage, canonical receipts and devnet Memo digest commitments. Keep weather authenticity and insurance-policy settlement distinct from the integrity commitment. No invented oracle decentralization or actuarial accuracy. Reuse the existing framework-security PR on the adaptation branch after review, without merging main.

## Alternatives considered
| Option | Why not |
|---|---|
| Solana + Base + Tempo | No evidenced distribution requirement; multiplies wallet/contract/liquidity/oracle integration surface before a deadline. |
| EVM rewrite | Discards working Anchor/client foundation without a measured product need. |
| Full decentralized weather oracle migration | Adds vendor setup/quorum governance and reliability claims that cannot be demonstrated honestly in the available scope. |
| Static screenshot-only demo | Not an executable product; users cannot inspect their own terms/data and reproduce the result. |
| Mainnet real coverage | No audit, legal underwriting/distribution arrangement or validated pricing; user authorized test funds only. |

## Consequences
A stranger can inspect and replay a receipt without a wallet; a funded devnet wallet can timestamp its digest. The Memo is not a policy account, oracle proof or token payout. ERA5 is gridded reanalysis, not a farm weather station; basis risk and provider trust remain. Existing program compilation/deployment is verified separately from new evidence functionality. Retaining legacy web3.js is intentional Anchor/wallet compatibility, not a recommendation for a new greenfield SDK.

## Revisit when
A validated buyer/distributor needs a different chain; an independent audit clears real-fund use; multiple independent weather publishers and licensed distribution are available; a production weather-data licence/operating budget is approved.
