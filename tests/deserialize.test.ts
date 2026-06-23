import { PublicKey } from '@solana/web3.js'
import { PROGRAM_ID } from '../lib/nimbus'
import {
  deserializeGlobalConfig,
  deserializeMultisigConfig,
  deserializePool,
  deserializePolicy,
  validateMultisigInvariants,
  validatePoolInvariants,
  validatePolicyInvariants,
  DeserializationError,
  POOL_MIN_LEN,
  POLICY_MIN_LEN,
} from '../lib/deserialize'
import assert from 'assert'

// Helper: build a buffer with the correct discriminator and owner for testing
function buildAccountBuffer(discriminator: number[], size: number, fill: number = 0): Buffer {
  const buf = Buffer.alloc(size, fill)
  for (let i = 0; i < 8; i++) {
    buf[i] = discriminator[i]
  }
  return buf
}

const DISCRIMINATORS = {
  GlobalConfig:   [149, 8, 156, 202, 160, 252, 176, 217],
  MultisigConfig: [44, 62, 172, 225, 246, 3, 178, 33],
  Pool:           [241, 154, 109, 4, 17, 177, 109, 188],
  Policy:         [222, 135, 7, 163, 235, 177, 33, 68],
}

describe('lib/deserialize.ts — Account Deserialization Security Tests', () => {

  // ── Discriminator Validation ──

  describe('Discriminator Validation', () => {
    it('rejects account with wrong discriminator', () => {
      const buf = Buffer.alloc(243, 0) // MultisigConfig size
      // Wrong discriminator (all zeros)
      assert.throws(
        () => deserializeMultisigConfig(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('discriminator mismatch'),
      )
    })

    it('rejects GlobalConfig discriminator on MultisigConfig data', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.GlobalConfig, 243)
      assert.throws(
        () => deserializeMultisigConfig(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('discriminator mismatch'),
      )
    })

    it('rejects Pool discriminator on Policy data', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.Pool, 197)
      assert.throws(
        () => deserializePolicy(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('discriminator mismatch'),
      )
    })

    it('accepts correct MultisigConfig discriminator', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.MultisigConfig, 243)
      // Should not throw on discriminator (may have zero data but won't fail discriminator check)
      const result = deserializeMultisigConfig(buf, PROGRAM_ID)
      assert.ok(result)
    })
  })

  // ── Owner Validation ──

  describe('Owner Validation', () => {
    it('rejects account owned by wrong program', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.MultisigConfig, 243)
      const wrongOwner = new PublicKey('11111111111111111111111111111111')
      assert.throws(
        () => deserializeMultisigConfig(buf, wrongOwner),
        (err: any) => err instanceof DeserializationError && err.message.includes('owner mismatch'),
      )
    })

    it('accepts account owned by PROGRAM_ID', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.MultisigConfig, 243)
      const result = deserializeMultisigConfig(buf, PROGRAM_ID)
      assert.ok(result)
    })
  })

  // ── Length Validation ──

  describe('Length Validation', () => {
    it('rejects truncated GlobalConfig (< 193 bytes)', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.GlobalConfig, 50) // Way too short
      assert.throws(
        () => deserializeGlobalConfig(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('data too short'),
      )
    })

    it('rejects truncated MultisigConfig (< 243 bytes)', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.MultisigConfig, 100)
      assert.throws(
        () => deserializeMultisigConfig(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('data too short'),
      )
    })

    it('rejects truncated Pool (< 143 bytes)', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.Pool, 50)
      assert.throws(
        () => deserializePool(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('data too short'),
      )
    })

    it('rejects truncated Policy (< 197 bytes)', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.Policy, 100)
      assert.throws(
        () => deserializePolicy(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('data too short'),
      )
    })

    it('rejects empty buffer', () => {
      const buf = Buffer.alloc(0)
      assert.throws(
        () => deserializeGlobalConfig(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError,
      )
    })
  })

  // ── MultisigConfig Deserialization ──

  describe('MultisigConfig Deserialization', () => {
    function buildMultisigBuffer(threshold: number, numAuthorities: number, authorities: PublicKey[]): Buffer {
      const buf = buildAccountBuffer(DISCRIMINATORS.MultisigConfig, 243)
      buf[8] = threshold
      buf[9] = numAuthorities
      let offset = 10
      for (let i = 0; i < 7; i++) {
        const key = i < authorities.length ? authorities[i] : PublicKey.default
        key.toBuffer().copy(buf, offset)
        offset += 32
      }
      // proposalNonce (8 bytes) + bump (1 byte) — leave as zeros
      return buf
    }

    it('correctly parses threshold and numAuthorities', () => {
      const auth1 = PublicKey.unique()
      const auth2 = PublicKey.unique()
      const buf = buildMultisigBuffer(2, 2, [auth1, auth2])
      const config = deserializeMultisigConfig(buf, PROGRAM_ID)
      assert.strictEqual(config.threshold, 2)
      assert.strictEqual(config.numAuthorities, 2)
      assert.strictEqual(config.authorities.length, 2)
      assert.ok(config.authorities[0].equals(auth1))
      assert.ok(config.authorities[1].equals(auth2))
    })

    it('rejects numAuthorities > 7 (MAX_AUTHORITIES)', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.MultisigConfig, 243)
      buf[8] = 3  // threshold
      buf[9] = 8  // numAuthorities = 8 > MAX_AUTHORITIES
      assert.throws(
        () => deserializeMultisigConfig(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('exceeds MAX_AUTHORITIES'),
      )
    })
  })

  // ── validateMultisigInvariants ──

  describe('validateMultisigInvariants', () => {
    it('returns no warnings for valid config', () => {
      const auth1 = PublicKey.unique()
      const auth2 = PublicKey.unique()
      const warnings = validateMultisigInvariants({
        threshold: 2,
        numAuthorities: 2,
        authorities: [auth1, auth2],
        proposalNonce: 0,
        bump: 255,
      })
      assert.strictEqual(warnings.length, 0)
    })

    it('warns on threshold = 0', () => {
      const warnings = validateMultisigInvariants({
        threshold: 0,
        numAuthorities: 2,
        authorities: [PublicKey.unique(), PublicKey.unique()],
        proposalNonce: 0,
        bump: 255,
      })
      assert.ok(warnings.some(w => w.includes('Threshold is 0')))
    })

    it('warns when threshold exceeds authority count', () => {
      const warnings = validateMultisigInvariants({
        threshold: 5,
        numAuthorities: 2,
        authorities: [PublicKey.unique(), PublicKey.unique()],
        proposalNonce: 0,
        bump: 255,
      })
      assert.ok(warnings.some(w => w.includes('exceeds authority count')))
    })

    it('detects duplicate authorities', () => {
      const sameKey = PublicKey.unique()
      const warnings = validateMultisigInvariants({
        threshold: 2,
        numAuthorities: 3,
        authorities: [sameKey, PublicKey.unique(), sameKey],
        proposalNonce: 0,
        bump: 255,
      })
      assert.ok(warnings.some(w => w.includes('Duplicate authority')))
    })

    it('detects multiple issues simultaneously', () => {
      const sameKey = PublicKey.unique()
      const warnings = validateMultisigInvariants({
        threshold: 0,
        numAuthorities: 2,
        authorities: [sameKey, sameKey],
        proposalNonce: 0,
        bump: 255,
      })
      assert.ok(warnings.length >= 2, 'Should detect both threshold=0 and duplicate')
      assert.ok(warnings.some(w => w.includes('Threshold is 0')))
      assert.ok(warnings.some(w => w.includes('Duplicate authority')))
    })
  })

  // ── GlobalConfig Deserialization ──

  describe('GlobalConfig Deserialization', () => {
    it('parses valid GlobalConfig with correct field positions', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.GlobalConfig, 193)
      // Set admin pubkey at offset 8
      const admin = PublicKey.unique()
      admin.toBuffer().copy(buf, 8)
      // Set paused = true at offset 40
      buf[40] = 1

      const config = deserializeGlobalConfig(buf, PROGRAM_ID)
      assert.ok(config.admin.equals(admin))
      assert.strictEqual(config.paused, true)
    })

    it('accepts buffer larger than minimum length', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.GlobalConfig, 300) // Extra bytes
      const config = deserializeGlobalConfig(buf, PROGRAM_ID)
      assert.ok(config)
    })
  })

  // ── Pool Deserialization ──

  describe('Pool Deserialization', () => {
    it('parses valid Pool buffer', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.Pool, POOL_MIN_LEN)
      const result = deserializePool(buf, PROGRAM_ID)
      assert.ok(result)
      assert.strictEqual(result.poolId, 0)
      assert.strictEqual(result.peril, 0)
    })
  })

  // ── Policy Deserialization ──

  describe('Policy Deserialization', () => {
    it('parses valid Policy buffer', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.Policy, POLICY_MIN_LEN)
      const result = deserializePolicy(buf, PROGRAM_ID)
      assert.ok(result)
      assert.strictEqual(result.policyId, 0)
      assert.strictEqual(result.status, 0)
      assert.strictEqual(result.triggered, false)
    })
  })

  // ── validatePoolInvariants ──

  describe('validatePoolInvariants', () => {
    it('returns no warnings for healthy pool', () => {
      const warnings = validatePoolInvariants({
        poolId: 1, peril: 0, regionSetHash: new Uint8Array(32),
        maxTenorSecs: 86400, ltvLimitBps: 5000,
        capital: 1000000, locked: 200000,
        lpMint: PublicKey.default, vaultUsdcAta: PublicKey.default,
        createdAtUnix: 1000000,
      })
      assert.strictEqual(warnings.length, 0)
    })

    it('warns when locked > capital (insolvency)', () => {
      const warnings = validatePoolInvariants({
        poolId: 1, peril: 0, regionSetHash: new Uint8Array(32),
        maxTenorSecs: 86400, ltvLimitBps: 5000,
        capital: 1000000, locked: 2000000,
        lpMint: PublicKey.default, vaultUsdcAta: PublicKey.default,
        createdAtUnix: 1000000,
      })
      assert.ok(warnings.some(w => w.includes('insolvent')))
    })

    it('warns on high utilization (>= 90%)', () => {
      const warnings = validatePoolInvariants({
        poolId: 1, peril: 0, regionSetHash: new Uint8Array(32),
        maxTenorSecs: 86400, ltvLimitBps: 5000,
        capital: 1000000, locked: 950000,
        lpMint: PublicKey.default, vaultUsdcAta: PublicKey.default,
        createdAtUnix: 1000000,
      })
      assert.ok(warnings.some(w => w.includes('approaching capacity')))
    })

    it('warns on zero LTV limit', () => {
      const warnings = validatePoolInvariants({
        poolId: 1, peril: 0, regionSetHash: new Uint8Array(32),
        maxTenorSecs: 86400, ltvLimitBps: 0,
        capital: 1000000, locked: 0,
        lpMint: PublicKey.default, vaultUsdcAta: PublicKey.default,
        createdAtUnix: 1000000,
      })
      assert.ok(warnings.some(w => w.includes('LTV limit is 0')))
    })

    it('warns on over-leveraged LTV (> 10000 bps)', () => {
      const warnings = validatePoolInvariants({
        poolId: 1, peril: 0, regionSetHash: new Uint8Array(32),
        maxTenorSecs: 86400, ltvLimitBps: 15000,
        capital: 1000000, locked: 0,
        lpMint: PublicKey.default, vaultUsdcAta: PublicKey.default,
        createdAtUnix: 1000000,
      })
      assert.ok(warnings.some(w => w.includes('over-leverageable')))
    })
  })

  // ── validatePolicyInvariants ──

  describe('validatePolicyInvariants', () => {
    it('returns no warnings for valid policy', () => {
      const warnings = validatePolicyInvariants({
        policyId: 1, owner: PublicKey.default, poolId: 1,
        pool: PublicKey.default, regionId: 1, peril: 0,
        windowStartUnix: 1000000, windowEndUnix: 2000000,
        indexMethod: 0, direction: 0, threshold: 100,
        payoutAmount: 50000, premiumAmount: 5000,
        status: 0, observedValue: 0, triggered: false,
        settledAtUnix: 0, quoteHash: new Uint8Array(32),
        createdAtUnix: 1000000,
      })
      assert.strictEqual(warnings.length, 0)
    })

    it('warns on invalid time window', () => {
      const warnings = validatePolicyInvariants({
        policyId: 1, owner: PublicKey.default, poolId: 1,
        pool: PublicKey.default, regionId: 1, peril: 0,
        windowStartUnix: 2000000, windowEndUnix: 1000000,
        indexMethod: 0, direction: 0, threshold: 100,
        payoutAmount: 50000, premiumAmount: 5000,
        status: 0, observedValue: 0, triggered: false,
        settledAtUnix: 0, quoteHash: new Uint8Array(32),
        createdAtUnix: 1000000,
      })
      assert.ok(warnings.some(w => w.includes('invalid time range')))
    })

    it('warns on zero payout', () => {
      const warnings = validatePolicyInvariants({
        policyId: 1, owner: PublicKey.default, poolId: 1,
        pool: PublicKey.default, regionId: 1, peril: 0,
        windowStartUnix: 1000000, windowEndUnix: 2000000,
        indexMethod: 0, direction: 0, threshold: 100,
        payoutAmount: 0, premiumAmount: 0,
        status: 0, observedValue: 0, triggered: false,
        settledAtUnix: 0, quoteHash: new Uint8Array(32),
        createdAtUnix: 1000000,
      })
      assert.ok(warnings.some(w => w.includes('no value')))
    })

    it('warns when premium exceeds payout', () => {
      const warnings = validatePolicyInvariants({
        policyId: 1, owner: PublicKey.default, poolId: 1,
        pool: PublicKey.default, regionId: 1, peril: 0,
        windowStartUnix: 1000000, windowEndUnix: 2000000,
        indexMethod: 0, direction: 0, threshold: 100,
        payoutAmount: 1000, premiumAmount: 5000,
        status: 0, observedValue: 0, triggered: false,
        settledAtUnix: 0, quoteHash: new Uint8Array(32),
        createdAtUnix: 1000000,
      })
      assert.ok(warnings.some(w => w.includes('unfavorable')))
    })

    it('warns on unknown peril type', () => {
      const warnings = validatePolicyInvariants({
        policyId: 1, owner: PublicKey.default, poolId: 1,
        pool: PublicKey.default, regionId: 1, peril: 99,
        windowStartUnix: 1000000, windowEndUnix: 2000000,
        indexMethod: 0, direction: 0, threshold: 100,
        payoutAmount: 50000, premiumAmount: 5000,
        status: 0, observedValue: 0, triggered: false,
        settledAtUnix: 0, quoteHash: new Uint8Array(32),
        createdAtUnix: 1000000,
      })
      assert.ok(warnings.some(w => w.includes('Unknown peril')))
    })
  })

  // ── Cross-type Confusion Attack ──

  describe('Cross-type Confusion Attack Prevention', () => {
    it('rejects MultisigConfig account passed to deserializeGlobalConfig', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.MultisigConfig, 243)
      assert.throws(
        () => deserializeGlobalConfig(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('discriminator mismatch'),
      )
    })

    it('rejects GlobalConfig account passed to deserializePool', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.GlobalConfig, 193)
      assert.throws(
        () => deserializePool(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('discriminator mismatch'),
      )
    })

    it('rejects Policy account passed to deserializeMultisigConfig', () => {
      const buf = buildAccountBuffer(DISCRIMINATORS.Policy, 243)
      assert.throws(
        () => deserializeMultisigConfig(buf, PROGRAM_ID),
        (err: any) => err instanceof DeserializationError && err.message.includes('discriminator mismatch'),
      )
    })
  })
})
