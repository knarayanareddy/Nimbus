---
name: testing-frontend
description: Test the Nimbus frontend UI/UX end-to-end. Use when verifying frontend changes, dark theme, navigation, buy flow, or page rendering.
---

# Testing Nimbus Frontend

## Quick Start

```bash
cd /home/ubuntu/Climafi
npm install
npm run dev -- -p 3000
```

Then open `http://localhost:3000` in the browser.

## Known Issues & Workarounds

### CSP and React Hydration in Dev Mode

The `next.config.js` has environment-aware CSP: `'wasm-unsafe-eval'` always + `'unsafe-eval' 'unsafe-inline'` in dev mode only. If buttons render but don't respond to clicks, React hydration may be blocked.

**Diagnosis:** Check browser console for CSP violation errors. Verify hydration:
```js
const btn = document.querySelector('button');
const propsKey = Object.keys(btn).find(k => k.startsWith('__reactProps$'));
console.log('Hydrated:', !!propsKey);
```

**Fix:** Ensure `NODE_ENV` is not set to `'production'` in dev. The CSP conditionally includes `'unsafe-eval' 'unsafe-inline'` only when `NODE_ENV !== 'production'`.

### pino-pretty Module Warning

The `@walletconnect/solana-adapter` dependency chain references `pino-pretty` which may not be installed. This is a non-blocking webpack warning.

### WalletProvider Import Error

`BackpackWalletAdapter` may not be exported from `@solana/wallet-adapter-wallets` in newer versions. If the app crashes with a 500 on any page, check `components/WalletProvider.tsx` and remove the Backpack import.

### Program ID Validation

The Solana `PublicKey` constructor rejects invalid base58 characters. If `lib/nimbus.ts` has a program ID with lowercase `l` (not valid base58), it will crash on page load. Valid base58 uses uppercase `I` and `L` but not lowercase `l`.

### Buy Flow Nav Link Resets State

The nav link to `/buy` uses a bare route without URL params. Navigating away and clicking "Buy Cover" in the nav resets form state. This is expected behavior — the URL state persistence works correctly when:
- Refreshing the page (F5)
- Using browser back button
- Navigating directly to a URL with params

## Test Plan Structure

### Pages to Test

1. **Landing** (`/`) — Dark theme, Nav, hero, trust signals (4 stat cards + 4 badges), "How It Works" cards with hover effects
2. **Buy** (`/buy`) — 3-step wizard (Configure → Review Quote → Purchase), URL state persistence, wallet CTA at step 2
3. **Portfolio** (`/portfolio`) — "Connect your wallet" state when disconnected
4. **Pools** (`/pools`) — "Underwriter Pools" title, "How Underwriting Works" 3-step section, empty state
5. **Settle** (`/settle`) — Policy ID lookup input, dark styling
6. **Governance** (`/governance`) — Auto-fetches multisig config on mount (no button needed)

### Key Assertions

- Background must be near-black (zinc-950), NOT white
- Nav bar must appear on ALL pages with 5 links + wallet button
- "Get Quote" button must advance from step 1 to step 2 (calls `/api/quotes/calculate`)
- Step 2 must show "Connect Wallet to Continue" button (NOT "Proceed to Purchase") when wallet disconnected
- Clicking "Connect Wallet to Continue" must open Solana wallet adapter modal
- URL must update with all 5 params on form change: `region`, `direction`, `days`, `threshold`, `payout`
- Trust signals: 4 stat cards ("55", "Ed25519", "M-of-N", "Auto") + 4 badges (OWASP, Solana, USDC, Switchboard)
- Governance page auto-fetches (shows error or data without manual button click)
- "How It Works" cards have dark bg with hover lift/border effect

### Testing the Buy Flow API

The `/api/quotes/calculate` route is self-contained (no external dependencies). Test it directly:
```bash
curl -X POST http://localhost:3000/api/quotes/calculate \
  -H "Content-Type: application/json" \
  -d '{"poolId":1,"regionId":"KEN-NRB-001","windowStartUnix":1750000000,"windowEndUnix":1751209600,"thresholdMm":80,"direction":"LT","payoutAmount":500000000}'
```

Expected: returns `premiumAmount` in response.

### Mobile Responsive Testing

Use Chrome DevTools device toolbar (Ctrl+Shift+M when DevTools is open) to simulate mobile viewport. The hamburger menu button has `aria-label="Toggle navigation menu"`.

### Accessibility Testing

Tab through elements on the buy page. Focus ring should be visible as a blue outline on:
- Nav links
- Form inputs (select, range, number)
- Buttons (Drought/Flood toggle, Get Quote)

## Port Conflicts

If ports 3000/3001/3002 are in use:
```bash
fuser -k 3000/tcp 2>/dev/null
# or
npx kill-port 3000
```

## Merge Artifact Issues

After merging multiple PRs (especially PRs that touch `lib/deserialize.ts`), check for duplicate function definitions:
```bash
grep -n "export function validate" lib/deserialize.ts | sort
```
If duplicates exist, remove the later definitions and commit a fix.

## Devin Secrets Needed

None required for frontend testing. The app runs without wallet connection for all visual/UI tests.
