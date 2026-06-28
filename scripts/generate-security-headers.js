/**
 * Security Headers Generator for Static Exports (GitHub Pages / Static Hosting)
 * OWASP A05 Mitigation + A06 Component Hardening
 * 
 * Generates a _headers file compatible with:
 * - GitHub Pages (via peaceiris/actions-gh-pages)
 * - Netlify
 * - Cloudflare Pages
 * - Vercel (static)
 */

const fs = require('fs');
const path = require('path');

const outDir = process.env.OUT_DIR || 'out';
const headersPath = path.join(outDir, '_headers');

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://*.solana.com https://api.mainnet-beta.solana.com https://api.devnet.solana.com wss://*.solana.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const headersContent = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: ${cspDirectives}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-XSS-Protection: 1; mode=block
`;

try {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  fs.writeFileSync(headersPath, headersContent);
  console.log(`✅ Security headers written to ${headersPath}`);
  console.log('   - CSP, X-Frame-Options, HSTS, and other OWASP headers included.');
  console.log('   - Compatible with GitHub Pages, Netlify, Cloudflare Pages.');
} catch (err) {
  console.error('❌ Failed to generate security headers:', err.message);
  process.exit(1);
}
