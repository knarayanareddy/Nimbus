# Reproduce the real local-validator policy check

This is a **test-only financial-mechanics regression**, with a synthetic 5mm reading and intentionally backdated one-day windows. It is not purchased weather coverage or an authentic ERA5 payout. Never use real funds or reset a user's existing ledger.

The run exercised 9 confirmed/read-back Nimbus instruction transactions and 3 expected preflight failures; `docs/evidence/localnet-policy-proof.json` preserves immediate readbacks/logs. Later historical RPC lookup returned null despite the same genesis. `localnet-policy-account-readback.json` independently verifies current balances, policy statuses and exact loaded ELF bytes. Local signatures are not public explorer evidence.

## Build route actually exercised on this Mac

The installed Homebrew Cargo cannot consume `+toolchain` arguments. Use the already-installed SBF toolchain for this command only; do not change global defaults:

```sh
PATH=/Users/brightech/.rustup/toolchains/1.95.0-sbpf-solana-v1.57/bin:$PATH \
  /Users/brightech/.local/share/nimbus-toolchain/agave-v4.3.0/solana-release/bin/cargo-build-sbf \
  --no-rustup-override --manifest-path programs/nimbus/Cargo.toml \
  --sbf-out-dir /Users/brightech/.hermes/cache/scratch/nimbus-closure-sbf -- --locked
```

On another machine, first install the matching Solana SBF toolchain using the official manual guide and adapt these non-secret installation paths. The owned CreatePool stack diagnostic is removed; Token-2022 dependency diagnostics remain despite rc=0, so this is **not a clean-build/production-security certification**. The tested ELF SHA-256 is `a3cff4d3ed5f84871db028313549a1dbbd8333fc228a6b800922658421aaa1d0`.

## Fresh task-owned validator

Use a new empty ledger directory; do **not** add `--reset` to an existing one. Two terminals:

```sh
solana-test-validator --ledger .anchor/policy-proof-fresh \
  --rpc-port 19199 --faucet-port 19210 --dynamic-port-range 23000-23040 \
  --bind-address 127.0.0.1 \
  --bpf-program CLiMaFi1111111111111111111111111111111111111 /path/to/nimbus.so
```

```sh
npm ci --include=dev
NIMBUS_PROGRAM_SO=/path/to/the/exact/preloaded/nimbus.so npm run demo:policy:localnet
```

The script hardcodes loopback, refuses known public-cluster genesis prefixes, verifies the loaded ProgramData ELF byte-for-byte, and requires a missing config account before generating ephemeral test signers. It never persists private keys. It encodes only source-verified instructions and uses the existing quote serializer; it does not claim the partial client IDL is complete.

Verified paths: config/pool initialization, actual SPL liquidity, Ed25519-bound policy buy, test observation, payout and no-payout settlement; recorded capital equals vault amount and liabilities unlock. Unauthorized settlement, repeat settlement and nonce replay fail for the intended controls. Configuration time bounds, publisher trust, pricing, regulatory/underwriting capacity and remaining dependency advisories still need independent production remediation/audit. Hosted policy signing stays disabled.
