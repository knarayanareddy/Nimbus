import { NextResponse } from 'next/server'
import sample from '../../../../data/colosseum/nairobi-archive.json'
import { validateReplayRequest, parseArchive, createReceipt } from '../../../../lib/evidence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  const terms = validateReplayRequest(sample.request)
  const evidence = parseArchive(sample.rawResponse, terms, sample.fetchedAt, 'captured-archive')
  return NextResponse.json(createReceipt(terms, evidence), { headers: { 'Cache-Control': 'no-store' } })
}
