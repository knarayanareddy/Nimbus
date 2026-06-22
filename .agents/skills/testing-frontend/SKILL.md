---
name: testing-climafi-frontend
description: Test the ClimaFi frontend UI/UX end-to-end. Use when verifying frontend changes, dark theme, navigation, buy flow, or page rendering.
---

# Testing ClimaFi Frontend

## Quick Start

```bash
cd /home/ubuntu/Climafi
npm install
npm run dev -- -p 3000
```

Then open `http://localhost:3000` in the browser.

## Known Issues & Workarounds

### CSP Blocks React Hydration in Dev Mode

The `Content-Security-Policy` header in `next.config.js` (`script-src 'self' 'wasm-unsafe-eval'`) may block Next.js client-side hydration. Symptoms: buttons render but don't respond to clicks, React event handlers not attached.

**Workaround:** Temporarily disable or relax the CSP in `next.config.js` for dev mode. Replace the CSP header with a no-op header, or add `'unsafe-eval'` to `script-src`.

**How to verify hydration works:** Run in browser console:
```js
const btn = document.querySelector('button');
const propsKey = Object.keys(btn).find(k => k.startsWith('__reactProps$'));
console.log('Hydrated:', !!propsKey);
```

### pino-pretty Module Warning

The `@walletconnect/solana-adapter` dependency chain references `pino-pretty` which may not be installed. This causes a webpack warning but does not break the build.

**Fix:** `npm install -D pino-pretty` or add webpack fallback in next.config.js:
```js
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.resolve.fallback = { ...config.resolve.fallback, 'pino-pretty': false }
  }
  return config
}
```

### WalletProvider Import Error

`BackpackWalletAdapter` may not be exported from `@solana/wallet-adapter-wallets` in newer versions. If the app crashes with a 500 on any page, check `components/WalletProvider.tsx` and remove the Backpack import.

### Program ID Validation

The Solana `PublicKey` constructor rejects invalid base58 characters. If `lib/climafi.ts` has a program ID with lowercase `l` (not valid base58), it will crash on page load. Valid base58 uses uppercase `I` and `L` but not lowercase `l`.

## Test Plan Structure

### Pages to Test

1. **Landing** (`/`) — Dark theme, Nav, hero, "How It Works" cards, CTA buttons
2. **Buy** (`/buy`) — 3-step wizard (Configure → Review Quote → Purchase), form inputs
3. **Portfolio** (`/portfolio`) — "Connect your wallet" state when disconnected
4. **Pools** (`/pools`) — "Underwriter Pools" title, info section, pool cards
5. **Settle** (`/settle`) — Policy ID lookup input, dark styling
6. **Governance** (`/governance`) — "Load Governance State" button

### Key Assertions

- Background must be near-black (zinc-950), NOT white
- Nav bar must appear on ALL pages with 5 links + wallet button
- "Get Quote" button must advance from step 1 to step 2 (calls `/api/quotes/calculate`)
- Portfolio must NOT make API calls to non-existent endpoints (should use `getProgramAccounts`)
- Mobile viewport (~375px): hamburger menu appears, nav links hidden
- Tab navigation: blue focus ring (`outline-blue-500`) on all interactive elements

### Testing the Buy Flow API

The `/api/quotes/calculate` route is self-contained (no external dependencies). Test it directly:
```bash
curl -X POST http://localhost:3000/api/quotes/calculate \
  -H "Content-Type: application/json" \
  -d '{"poolId":1,"regionId":"KEN-NRB-001","windowStartUnix":1750000000,"windowEndUnix":1751209600,"thresholdMm":80,"direction":"LT","payoutAmount":500000000}'
```

Expected response: `{"premiumAmount":23625000,"breakdown":{...},"quoteValiditySecs":120}`

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

## Devin Secrets Needed

None required for frontend testing. The app runs without wallet connection for all visual/UI tests.
