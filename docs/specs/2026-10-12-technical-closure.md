# Technical closure — test-only SBF and submission assets

**Status:** implemented (bounded test-only technical/media scope; Arena editing excluded at user's request)
**Scope:** user requested hosted demo/presentation materials and measured technical-blocker remediation; keep main untouched and use only localnet/devnet test funds. No final Arena submission, personal/eligibility attestation, production underwriting or audit claim.

## Observed baseline
Parent fresh build with the installed SBF toolchain, --no-rustup-override and --locked reproduces CreatePool::try_accounts frame 4160 >4096 and confidential Token-2022 proof-function diagnostics despite exit 0. Default Homebrew Cargo cannot consume the toolchain override; this invocation defect is now separated from actual program diagnostics. Full npm baseline: 0 critical, 33 high, 15 moderate. A separately tested candidate pins Wrangler 4.149.0 and repairs vulnerable glob10/serialize-javascript chains: 0 critical, 23 high, 15 moderate with lint/types/build, 62 unit, 6 adapter and 10 browser tests passing.

## Bounded changes and gates
- Preserve CreatePool instruction arguments, account names/order/seeds and stored account layouts; box large validation wrappers only.
- Verify host tests and fresh SBF compiler diagnostics; require the owned CreatePool stack violation to disappear. Do not call exit 0 a clean build or erase remaining dependency diagnostics.
- If an ELF is usable, exercise a fresh local validator with the actual program and confirm initialization/pool and policy state/balance changes, distinguishing a bounded runtime test from production safety.
- Use an authoritative matching Anchor IDL or source-verified ABI encoding; do not invent accounts/arguments or treat a partial client IDL as complete.
- Hosted presentation/demo/player/captions must read back at real public URLs and work independently of the laptop. Keep generated product narration distinct from founder identity/appearance.
- **Cancelled/excluded at the user's subsequent explicit request:** Arena editor reads/writes and final submission. The signed-in Chrome target was not script-controllable; no permission bypass or field changes were made. Supply verified product URLs/source text instead. Exact form-specific video-host restrictions remain unverified.

## Non-goals and preserved limits
Existing policy-time/pricing/permissioned-oracle assumptions, weather basis risk, commercial data licensing, insurance law and real capacity are not cleared by local tests. Unpatched dependency advisories remain disclosed. No mainnet/private-wallet secrets enter source or browser bundles.
