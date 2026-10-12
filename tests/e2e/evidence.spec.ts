import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { canonicalJson } from '../../lib/evidence'

test('captured sample, receipt export/import and buy handoff work without a wallet', async ({ page, isMobile }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  await page.goto('/evidence')
  await expect(page.getByRole('heading', { name: 'Rainfall Evidence Lab' })).toBeVisible()
  await page.getByRole('button', { name: 'Load captured sample', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Rainfall replay result' })).toBeVisible()
  await expect(page.getByText('4.60 mm', { exact: true })).toBeVisible()
  await expect(page.getByText('Hypothetical payout: 500 test USDC', { exact: true })).toBeVisible()
  await expect(page.getByText('Offline recorded evidence · captured archive sample. This is not a live replay.')).toBeVisible()
  await expect(page.getByRole('row')).toHaveCount(15)
  await expect(page.getByRole('button', { name: 'Anchor receipt on Solana devnet' })).toBeDisabled()
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download receipt' }).click()
  const download = await downloadEvent
  const path = await download.path()
  expect(path).toBeTruthy()
  await page.getByLabel('Choose receipt JSON to verify').setInputFiles(path!)
  await expect(page.getByRole('status')).toContainText('Receipt verified')
  const link = page.getByRole('link', { name: 'Continue to buy settings' })
  await expect(link).toHaveAttribute('href', /region=KEN-NRB-001.*days=14.*threshold=80.*payout=500/)
  await link.scrollIntoViewIfNeeded()
  await expect(link).toBeInViewport()
  if (isMobile) await link.tap()
  else await link.click()
  await expect(page.getByRole('heading', { name: 'Buy Parametric Cover' })).toBeVisible()
  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('a tampered imported receipt is rejected, including a recomputed forged digest', async ({ page, request }) => {
  const sample = await request.get('/api/evidence/sample'); expect(sample.ok()).toBe(true)
  const envelope = await sample.json()
  envelope.receipt.result.observedMmX100 = 99999
  envelope.digest = createHash('sha256').update(canonicalJson(envelope.receipt)).digest('hex')
  await page.goto('/evidence')
  await page.getByLabel('Choose receipt JSON to verify').setInputFiles({ name: 'tampered.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(envelope)) })
  await expect(page.getByRole('alert').filter({ hasText: 'independent replay' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Rainfall replay result' })).toHaveCount(0)
})

test('historical date errors never become successful evidence', async ({ page }) => {
  await page.goto('/evidence')
  await page.getByLabel('End date (UTC, exclusive)').fill('2026-08-31')
  await page.getByRole('button', { name: 'Replay historical rainfall', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'End date must be after' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Rainfall replay result' })).toHaveCount(0)
})

test('nonce CSP permits hydration without allowing arbitrary inline script', async ({ request, page }) => {
  const first = await request.get('/evidence'); const second = await request.get('/evidence')
  const a = first.headers()['content-security-policy']; const b = second.headers()['content-security-policy']
  expect(a).toContain("'nonce-"); expect(a).not.toBe(b)
  expect(a.split('script-src')[1].split(';')[0]).not.toContain('unsafe-inline')
  const violations: string[] = []
  page.on('console', message => { if (/violates.*Content Security Policy|Refused to execute inline/i.test(message.text())) violations.push(message.text()) })
  await page.goto('/evidence')
  await page.getByRole('button', { name: 'Load captured sample', exact: true }).click()
  await expect(page.getByText('4.60 mm', { exact: true })).toBeVisible()
  expect(violations).toEqual([])
})

test('HTTP evidence validates inputs and fails closed on unavailable policy issuance', async ({ request }) => {
  const invalid = await request.post('/api/evidence', { data: { regionId: 'attacker', startDate: '2026-09-01', endDate: '2026-09-15', indexMethod: 'Sum', direction: 'LT', thresholdMm: 80, payoutUsdc: 500 } })
  expect(invalid.status()).toBe(400); expect((await invalid.json()).error).toBe('Unknown region')
  const quote = await request.post('/api/quotes/sign', { data: {} })
  expect(quote.status()).toBe(503); expect((await quote.json()).error).toContain('not configured')
})
