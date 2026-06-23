# Nimbus Professional Security Audit Checklist

**Prepared for:** Professional Security Auditors (OtterSec, Certik, Neodyme, etc.)  
**Date:** 2026-06-22  
**Version:** 1.0

---

## 1. Program Overview

- **Program ID:** `CLiMaFi1111111111111111111111111111111111111`
- **Primary Language:** Rust + Anchor 0.29
- **Core Features:** Parametric rainfall cover, signed quotes, automatic settlement

---

## 2. Security Hardening Completed

### Access Control (A01)
- [x] Admin-only functions protected (`set_paused`, `initialize_config`)
- [x] Owner validation in `settle_policy`
- [x] Oracle authority check in `record_observation`

### Signature & Input Validation (A03)
- [x] Ed25519 verification with `quote_signer` check
- [x] Quote expiry validation
- [x] Premium amount > 0 check

### Insecure Design (A04)
- [x] All math uses checked arithmetic
- [x] No panics in critical paths
- [x] Staleness enforcement on observations

### Security Logging (A09)
- [x] Structured security event logging
- [x] Critical alerting via PagerDuty/Slack ready

---

## 3. Test Coverage

- [x] Functional tests (`tests/nimbus.ts`)
- [x] OWASP-mapped security tests (`tests/security-audit.ts`)
- [x] Automated security test runner (`scripts/run-security-tests.sh`)

---

## 4. Economic & Risk Controls

- [x] Dynamic LTV calculation module (`risk.rs`)
- [x] Utilization-based surcharge pricing
- [x] Safety floor on LTV (30%)

---

## 5. Oracle Decentralization

- [x] Switchboard V2 on-chain integration module (`switchboard.rs`)
- [x] Confidence + staleness checks enforced

---

## 6. Compliance & Governance

- [x] Full legal & risk disclosure document (`LEGAL.md`)
- [x] KYC/AML policy defined
- [x] Governance transition plan with timelock (`governance/README.md`)

---

## 7. Items Recommended for Auditor Review

1. Full Ed25519 instruction verification logic
2. `settle_policy` remaining accounts validation
3. Dynamic LTV math correctness
4. Switchboard aggregator account validation
5. LP math (deposit/withdraw) correctness under edge cases

---

## 8. Contact

For questions during the audit, please reach out via the repository or legal@nimbus.xyz.

---

*This checklist represents the current security posture of the Nimbus protocol as of the date above.*