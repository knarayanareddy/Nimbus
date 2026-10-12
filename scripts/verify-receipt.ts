import * as fs from 'node:fs'
import { verifyReceipt } from '../lib/evidence'

const path = process.argv[2]
if (!path) { console.error('Usage: npm run verify:receipt -- /absolute/path/receipt.json'); process.exit(2) }
try {
  const bytes = fs.statSync(path).size
  if (bytes > 64_000) throw new Error('Receipt exceeds 64000 bytes')
  const envelope = verifyReceipt(JSON.parse(fs.readFileSync(path, 'utf8')))
  console.log(JSON.stringify({ valid: true, digest: envelope.digest, result: envelope.receipt.result,
    limitation: 'Integrity/replay only; not weather authenticity, purchased coverage or an onchain payout' }, null, 2))
} catch (error) { console.error(error instanceof Error ? error.message : 'Invalid receipt'); process.exit(1) }
