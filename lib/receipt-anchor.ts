import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'

export const DEVNET_GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
export function receiptMemo(digest: string): string {
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('Receipt digest must be lowercase SHA-256 hex')
  return `nimbus:rainfall-receipt:v1:${digest}`
}
export function createReceiptMemoInstruction(signer: PublicKey, digest: string): TransactionInstruction {
  return new TransactionInstruction({ programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }], data: Buffer.from(receiptMemo(digest), 'utf8') })
}
export async function anchorReceipt(connection: Connection,
  wallet: { publicKey: PublicKey | null; sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string> },
  digest: string): Promise<{ signature: string; slot: number; explorerUrl: string }> {
  if (!wallet.publicKey) throw new Error('Connect a funded devnet wallet')
  if (await connection.getGenesisHash() !== DEVNET_GENESIS_HASH) throw new Error('Receipt anchoring is restricted to Solana devnet; no mainnet funds')
  const latest = await connection.getLatestBlockhash('confirmed')
  const transaction = new Transaction({ feePayer: wallet.publicKey, ...latest }).add(createReceiptMemoInstruction(wallet.publicKey, digest))
  const signature = await wallet.sendTransaction(transaction, connection)
  const confirmation = await connection.confirmTransaction({ signature, ...latest }, 'confirmed')
  if (confirmation.value.err) throw new Error(`Devnet receipt transaction failed: ${JSON.stringify(confirmation.value.err)}`)
  return { signature, slot: confirmation.context.slot, explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet` }
}
