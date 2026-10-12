# 0002. Preserve Next.js execution on existing Cloudflare account

- **Status:** accepted
- **Date:** 2026-10-12
- **Deciders:** knarayanareddy / Hermes

## Context
User approved deployment using an existing hosting account. `wrangler whoami` observes account 15b7611f28f1e7f331d4b878015206fb with Worker write permission. Nimbus has server-side route handlers; GitHub Pages cannot run them. Current Cloudflare guidance recommends vinext, but its observed npm peer dependencies require React 19.2.6 and a new Vite stack; Nimbus remains React18/Next16 and a hackathon deadline applies. OpenNext1.20.10 explicitly accepts installed Next16.4.0 and adapts actual Next build output; official Cloudflare docs retain a manual adapter path.

## Decision
Use pinned @opennextjs/cloudflare1.20.10 and Wrangler4.148.0 on a new distinct Worker `nimbus-worldsfair-2026`, retaining Next's UI/API routes. No R2/D1/paid plan/secrets or real-fund program configuration are provisioned. Historical API calls have bounded timeout and receipt bodies have bounded size. Judge URLs public; burner test wallet keys never uploaded. Deployment is successful only after exact remote workflow readback, not a packaging command.

## Alternatives considered
| Option | Why not |
|---|---|
| vinext beta | Requires a separate React19/Vite migration; no demonstrated feature need and lower timebox certainty. |
| Static GitHub Pages | Cannot execute the evidence/verification handlers; would remove actual functionality. |
| Temporary laptop tunnel | Fails the presentation independence criterion and requires laptop uptime. |
| New Vercel account | No observed authorization/session; existing Cloudflare account is available. |

## Consequences
Adapter adds development dependencies and vendor coupling. Per-process prototype request limit is not globally distributed. No cloud storage/budget commitment is implied. Platform limits may block packaging; do not upgrade billing automatically. CSP uses fresh request nonces and dynamic rendering, avoiding blocked hydration rather than loosening scripts to unsafe-inline.

## Revisit when
OpenNext incompatibility is measured, vinext no longer requires a disruptive peer migration, or a production operator requires a different hosting/region/data-residency model.

Sources: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ ; https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/ ; https://opennext.js.org/cloudflare . Versions/peer claims were checked with npm view, not assumed from docs.
