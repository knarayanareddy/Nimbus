const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

async function main() {
  const baseURL = process.env.NIMBUS_BASE_URL || 'https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev'
  const output = path.resolve(process.env.NIMBUS_VIDEO_DIR || 'docs/demo-recording')
  fs.mkdirSync(output, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: output, size: { width: 1280, height: 720 } } })
  const page = await context.newPage()
  const started = Date.now()
  const cues = []
  async function show(text, seconds) {
    const at = (Date.now() - started) / 1000
    cues.push({ start: at, end: at + seconds, text })
    // Deliberate presentation hold, not a polling/retry delay.
    await page.waitForTimeout(seconds * 1000)
  }
  try {
    await page.goto(`${baseURL}/evidence`)
    await page.getByRole('heading', { name: 'Rainfall Evidence Lab' }).waitFor()
    await show('Nimbus makes rainfall policy inputs and outcomes inspectable. This is a historical, test-only prototype—not purchased coverage.', 14)
    await page.getByRole('button', { name: 'Replay historical rainfall', exact: true }).click()
    await page.getByRole('region', { name: 'Rainfall replay result' }).waitFor()
    await page.getByRole('region', { name: 'Rainfall replay result' }).scrollIntoViewIfNeeded()
    await show('This actual ERA5 archive contains fourteen complete UTC days. Nairobi totals 4.60 millimetres; the hypothetical inclusive drought trigger is met.', 18)
    await page.getByRole('heading', { name: 'Evidence provenance' }).scrollIntoViewIfNeeded()
    await show('Inspect the model, queried and grid coordinates, source URL and canonical SHA-256 receipt. These explain the data lineage, not independent weather authenticity.', 18)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download receipt' }).click()
    const receiptPath = await (await download).path()
    const envelope = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
    await page.getByLabel('Choose receipt JSON to verify').setInputFiles(receiptPath)
    await page.getByRole('status').filter({ hasText: 'Receipt verified' }).waitFor()
    await page.getByRole('status').scrollIntoViewIfNeeded()
    await show('Export the receipt, then independently verify its terms, observations and calculated outcome. The unchanged receipt passes.', 15)
    const bad = JSON.parse(JSON.stringify(envelope))
    bad.receipt.result.observedMmX100 = 99999
    await page.getByLabel('Choose receipt JSON to verify').setInputFiles({ name: 'tampered-receipt.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) })
    await page.getByRole('alert').filter({ hasText: 'independent replay' }).waitFor()
    await show('An altered result is rejected. The verifier reconstructs the calculation rather than trusting a number displayed by the server.', 14)
    await page.getByRole('button', { name: 'Load captured sample', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Offline recorded evidence' }).waitFor()
    await show('For reliability, a genuine captured archive is an explicit fallback. Its label makes clear that it is not a fresh live request.', 14)
    await page.getByRole('heading', { name: 'Evidence provenance' }).scrollIntoViewIfNeeded()
    await show('The optional Solana devnet Memo anchors the digest only. A real localnet Memo was confirmed and read back; devnet funding was blocked. No payout is claimed.', 17)
    await page.screenshot({ path: path.join(output, 'evidence-desktop.png'), fullPage: true })
    await show('New work: replayable evidence, an independent verifier, a Solana commitment path and accounting regressions. Existing protocol work is disclosed separately.', 12)
    fs.writeFileSync(path.join(output, 'cues.json'), JSON.stringify(cues, null, 2))
    const video = page.video()
    await context.close()
    const recorded = await video.path()
    console.log(JSON.stringify({ video: recorded, cues: path.join(output, 'cues.json'), elapsedSeconds: (Date.now() - started) / 1000, source: baseURL }))
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exit(1) })
