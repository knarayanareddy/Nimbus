/** @type {import('next').NextConfig} */

// Security headers remain here; request-specific CSP is in middleware.ts.

const nextConfig = {
  output: process.env.EXPORT_STATIC === 'true' ? 'export' : undefined,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
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
            // Per-request nonce CSP is supplied by middleware.ts so Next's
            // inline hydration scripts execute without allowing arbitrary inline JS.
          ],
        },
      ];
    },
  }),
};

module.exports = nextConfig;