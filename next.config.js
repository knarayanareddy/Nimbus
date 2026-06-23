/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production'

const cspDirectives = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' required for Solana wallet adapter WASM modules (Phantom, etc.)
  // 'unsafe-eval' allowed only in dev for Next.js hot module replacement
  `script-src 'self' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
  // 'unsafe-inline' required for Next.js inline style injection
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  // Solana RPC endpoints + WebSocket connections
  "connect-src 'self' https://*.solana.com https://api.mainnet-beta.solana.com https://api.devnet.solana.com wss://*.solana.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig = {
  output: process.env.EXPORT_STATIC === 'true' ? 'export' : undefined,
  images: {
    unoptimized: process.env.EXPORT_STATIC === 'true' ? true : undefined,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pino-pretty': false,
      }
    }
    return config
  },
  ...(process.env.EXPORT_STATIC === 'true' ? {} : {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
            { key: 'Content-Security-Policy', value: cspDirectives },
          ],
        },
      ];
    },
  }),
};

module.exports = nextConfig;