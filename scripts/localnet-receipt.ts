import fs from 'node:fs'
import { Connection, Keypair, Transaction } from '@solana/web3.js'
import sample from '../data/colosseum/nairobi-archive.json'
import { createReceipt, parseArchive, validateReplayRequest, verifyReceipt } from '../lib/evidence'
import { createReceiptMemoInstruction, MEMO_PROGRAM_ID, receiptMemo } from '../lib/receipt-anchor'

async function main() {
  // Explicit hardcoded loopback localnet, never an arbitrary/mainnet RPC.
  const connection = new Connection('http://127.0.0.1:18999', 'confirmed')
  const terms = validateReplayRequest(sample.request)
  const envelope = createReceipt(terms, parseArchive(sample.rawResponse, terms, sample.fetchedAt, 'captured-archive'))
  verifyReceipt(envelope)
  const memoProgram = await connection.getAccountInfo(MEMO_PROGRAM_ID)
  if (!memoProgram?.executable) throw new Error('Local validator has no executable Memo program')
  fs.mkdirSync('keys', { recursive: true })
  const key = Keypair.generate()
  fs.writeFileSync('keys/local-evidence.json', JSON.stringify(Array.from(key.secretKey)), { mode: 0o600 })
  const airdrop = await connection.requestAirdrop(key.publicKey, 1_000_000_000)
  await connection.confirmTransaction(airdrop, 'confirmed')
  const latest = await connection.getLatestBlockhash('confirmed')
  const tx = new Transaction({ feePayer: key.publicKey, ...latest }).add(createReceiptMemoInstruction(key.publicKey, envelope.digest))
  tx.sign(key)
  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 2 })
  const confirmation = await connection.confirmTransaction({ signature, ...latest }, 'confirmed')
  if (confirmation.value.err) throw new Error(JSON.stringify(confirmation.value.err))
  const observed = await connection.getParsedTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
  if (!observed || observed.meta?.err || !observed.transaction.message.instructions.some(ix => 'parsed' in ix && ix.parsed === receiptMemo(envelope.digest))) throw new Error('Exact localnet Memo readback failed')
  const proof = { cluster: 'localnet', rpc: 'http://127.0.0.1:18999', genesisHash: await connection.getGenesisHash(),
    signature, slot: observed.slot, signer: key.publicKey.toBase58(), digest: envelope.digest, memoProgram: MEMO_PROGRAM_ID.toBase58(),
    readbackVerified: true, limitation: 'Real transaction on local Solana validator; NOT a devnet deployment or policy purchase/payout' }
  fs.mkdirSync('docs/evidence', { recursive: true })
  fs.writeFileSync('docs/evidence/localnet-receipt-proof.json', JSON.stringify(proof, null, 2) + '\n')
  fs.writeFileSync('docs/evidence/sample-receipt.json', JSON.stringify(envelope, null, 2) + '\n')
  console.log(JSON.stringify(proof, null, 2))
}
main().catch(error => { console.error(error.message); process.exit(1) })
