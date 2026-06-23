#!/bin/bash
# Nimbus Security Test Runner
# Run this before any professional audit

set -e

echo "🔒 Starting Nimbus Security Test Suite..."

# 1. Static Analysis
echo "→ Running cargo audit..."
cargo install cargo-audit --quiet
cargo audit

echo "→ Running clippy with security lints..."
cargo clippy --all-targets -- -D warnings -W clippy::all -W clippy::pedantic

# 2. Build
echo "→ Building program..."
anchor build

# 3. Run Tests
echo "→ Running Anchor tests..."
anchor test

# 4. Security-specific tests
echo "→ Running OWASP + Solana security test suite..."
npx ts-mocha -p ./tsconfig.json tests/security-audit.ts

echo "✅ Security test suite completed successfully!"