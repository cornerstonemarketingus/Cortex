This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production Hosting

- Docker production image: `Dockerfile`
- Compose stack: `docker-compose.yml`
- Lightweight readiness endpoint: `/api/readyz`
- Deployment runbook: `docs/deployment-production.md`
- Domain + Google Workspace setup: `docs/domain-email-google-workspace.md`

Quick start:

```bash
npm run docker:up
```

## Split Into Two Separate Sites

You can run two branded sites from this single codebase:

- Contractor site (Bid Build)
- AI automation site (AIBoost)

Configure host-based entry routing with environment variables:

```bash
CORTEX_CONTRACTOR_DOMAINS=bidbuild.yourdomain.com,contractor.yourdomain.com
CORTEX_AUTOMATION_DOMAINS=aiboost.yourdomain.com,automation.yourdomain.com
```

Behavior:

- Requests to a contractor domain rewrite `/` to `/bid-build`
- Requests to an automation domain rewrite `/` to `/aiboost`
- Existing product/subdomain rewrites continue to work as before
