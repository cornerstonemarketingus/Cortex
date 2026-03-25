# Bid Build Production Deployment Guide

## Prerequisites
- Docker + Docker Compose installed
- Domain name purchased
- `.env.local` configured with production values

## Option A: Docker Compose (recommended quick start)
1. Build and start:
   - `npm run docker:up`
2. Verify health:
   - `http://localhost:3000/api/readyz`
3. Stop stack:
   - `npm run docker:down`

## Option B: Manual Node runtime
1. Install dependencies:
   - `npm ci`
2. Build:
   - `npm run build`
3. Run production server:
   - `npm run start:prod`

## Reverse Proxy and TLS
For production internet traffic, put a reverse proxy (Nginx/Caddy/Cloudflare) in front of the app:
- Route `https://yourdomain.com` to app port 3000
- Force HTTPS
- Enable gzip/brotli at proxy layer

## Runtime Checks
- Readiness endpoint: `/api/readyz`
- Deep health endpoint: `/api/health`

## CI/CD Minimum
- Trigger on push to main
- Run: `npm ci`, `npm run build`
- Build container image
- Deploy image and run readiness check

## Rollback Strategy
- Keep previous container image tags
- Roll back by redeploying last known-good tag
- Confirm with `/api/readyz`
