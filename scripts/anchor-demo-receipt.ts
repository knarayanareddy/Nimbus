import fs from 'node:fs'
import path from 'node:path'
import { Connection, Keypair } from '@solana/web3.js'
import sample from '../data/colosseum/nairobi-archive.json'
import { createReceipt, parseArchive, validateReplayRequest } from '../lib/evidence'
import { anchorReceipt, DEVNET_GENESIS_HASH } from '../lib/receipt-anchor'

async function main() {
  const terms = validateReplayRequest(sample.request)
  const envelope = createReceipt(terms, parseArchive(sample.rawResponse, terms, sample.fetchedAt, 'captured-archive'))
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const connection = new Connection(rpc, { commitment: 'confirmed', disableRetryOnRateLimit: true })
  if (await connection.getGenesisHash() !== DEVNET_GENESIS_HASH) throw new Error('Devnet only; refusing real funds')
  const keyPath = path.resolve('keys/devnet-evidence.json')
  fs.mkdirSync(path.dirname(keyPath), { recursive: true })
  let key: Keypair
  if (fs.existsSync(keyPath)) key = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, 'utf8'))))
  else { key = Keypair.generate(); fs.writeFileSync(keyPath, JSON.stringify(Array.from(key.secretKey)), { mode: 0o600, flag: 'wx' }) }
  console.log(JSON.stringify({ cluster: 'devnet', burner: key.publicKey.toBase58(), digest: envelope.digest }))
  if (await connection.getBalance(key.publicKey) < 100_000) {
    // One test-SOL request. No paid fallback or retry storm.
    const res = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [key.publicKey.toBase58(), 1_000_000_000] }), signal: AbortSignal.timeout(15_000) })
    const result = await res.json() as any
    if (!res.ok || result.error || typeof result.result !== 'string') throw new Error(`Devnet faucet unavailable: HTTP ${res.status} ${JSON.stringify(result.error || result)}`)
    await connection.confirmTransaction(result.result, 'confirmed')
  }
  const anchor = await anchorReceipt(connection, { publicKey: key.publicKey, sendTransaction: async tx => {
    tx.sign(key); return connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 2 })
  } }, envelope.digest)
  const observed = await connection.getParsedTransaction(anchor.signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
  if (!observed || observed.meta?.err) throw new Error('Exact transaction readback failed')
  const instructions = observed.transaction.message.instructions
  if (!instructions.some(ix => 'parsed' in ix && ix.parsed === `nimbus:rainfall-receipt:v1:${envelope.digest}`)) throw new Error('Memo readback does not match receipt digest')
  fs.mkdirSync('docs/evidence', { recursive: true })
  fs.writeFileSync('docs/evidence/devnet-receipt.json', JSON.stringify({ ...anchor, digest: envelope.digest, burner: key.publicKey.toBase58(), cluster: 'devnet', readbackVerified: true }, null, 2) + '\n')
  console.log(JSON.stringify({ ...anchor, readbackVerified: true }, null, 2))
}
main().catch(error => { console.error(error.message); process.exit(1) })
