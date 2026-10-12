import assert from 'node:assert/strict'
import { Keypair, Connection, Transaction } from '@solana/web3.js'
import { anchorReceipt, createReceiptMemoInstruction, DEVNET_GENESIS_HASH, MEMO_PROGRAM_ID, receiptMemo } from '../lib/receipt-anchor'

describe('Solana devnet receipt commitment', () => {
  const key = Keypair.generate().publicKey
  const digest = 'a'.repeat(64)
  it('binds lowercase digest, Memo program and required connected signer', () => {
    const ix = createReceiptMemoInstruction(key, digest)
    assert(ix.programId.equals(MEMO_PROGRAM_ID))
    assert(ix.keys[0].pubkey.equals(key)); assert.equal(ix.keys[0].isSigner, true)
    assert.equal(ix.data.toString(), `nimbus:rainfall-receipt:v1:${digest}`)
    for (const d of ['', 'a'.repeat(63), 'A'.repeat(64), 'g'.repeat(64)]) assert.throws(() => receiptMemo(d))
  })
  it('refuses unfunded/no-wallet connection and non-devnet genesis before sending', async () => {
    let sends = 0
    const wallet = { publicKey: key, sendTransaction: async () => { sends++; return 'signature' } }
    await assert.rejects(anchorReceipt({ getGenesisHash: async () => 'mainnet' } as unknown as Connection, wallet, digest), /restricted/)
    await assert.rejects(anchorReceipt({} as Connection, { ...wallet, publicKey: null }, digest), /Connect/)
    assert.equal(sends, 0)
  })
  function connection(err: unknown) {
    return { getGenesisHash: async () => DEVNET_GENESIS_HASH,
      getLatestBlockhash: async () => ({ blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 123 }),
      confirmTransaction: async () => ({ context: { slot: 42 }, value: { err } }) } as unknown as Connection
  }
  it('uses the same blockhash lifetime and refuses a failed confirmation', async () => {
    const wallet = { publicKey: key, sendTransaction: async (tx: Transaction) => {
      assert.equal(tx.instructions[0].data.toString(), receiptMemo(digest)); assert.equal(tx.lastValidBlockHeight, 123); return 'test-signature'
    } }
    await assert.rejects(anchorReceipt(connection({ InstructionError: [0, 'InvalidArgument'] }), wallet, digest), /transaction failed/)
    const got = await anchorReceipt(connection(null), wallet, digest)
    assert.equal(got.signature, 'test-signature'); assert.equal(got.slot, 42)
    assert.equal(got.explorerUrl, 'https://explorer.solana.com/tx/test-signature?cluster=devnet')
  })
})
