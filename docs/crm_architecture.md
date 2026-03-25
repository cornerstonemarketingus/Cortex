# Modular AI CRM Architecture

## Stack
- Frontend: Next.js App Router + Tailwind
- API: Next.js route handlers under app/api/crm
- DB: PostgreSQL + Prisma (dedicated CRM schema)
- Realtime: Pusher abstraction in src/crm/core/realtime.ts
- Queue: Redis + BullMQ (workflow and reminder queues)
- AI: OpenAI chat completions wrapper with retry and fixed-window rate limiting
- Auth: JWT (jose)

## Folder Structure
- app/api/crm/auth
- app/api/crm/capture
- app/api/crm/nurture
- app/api/crm/close
- app/api/crm/retain
- app/crm/capture/[slug]
- components/crm
- src/crm/core
- src/crm/modules/capture
- src/crm/modules/nurture
- src/crm/modules/close
- src/crm/modules/retain
- workers/crm.worker.ts
- prisma/crm/schema.prisma
- prisma/crm/sql/lead_score_triggers.sql

## Module Boundaries
- core: environment, auth, db adapter, API helpers, queue, realtime, OpenAI
- capture: lead intake, source/campaign attribution, inbound webhooks, calls, QR, business-card OCR, dynamic forms/landing pages
- nurture: unified inbox, AI auto-replies, workflow engine, reminders, appointments, pipeline
- close: scoring integration, proposals, PDF generation, invoices, Stripe checkout/webhooks, text-to-pay
- retain: review requests/replies, referral links/events, loyalty points, social posting queue, cron followups

## Data Flow
1. Capture endpoints create/update leads and persist every touchpoint in Conversation + Interaction.
2. Missed call / inbound events enqueue workflow jobs in Redis.
3. CRM worker consumes workflow and reminder queues and executes nurture actions.
4. Close module updates monetization records and calls lead scoring refresh.
5. Retain module automates review/referral/loyalty loops and followup cron processing.

## Event System
- Queue names:
  - crm-workflow-events
  - crm-reminders
- Producers:
  - capture.service (missed calls)
  - nurture.service (reminder scheduling)
- Consumers:
  - workers/crm.worker.ts

## AI Integration Points
- capture.service: business-card OCR parsing from image (OpenAI vision-compatible chat request)
- nurture.service: conversation auto-replies with tone control (friendly/sales/support)
- retain.service: AI-generated review replies
- openai.ts centralizes:
  - retry logic (exponential backoff)
  - rate limit control (fixed-window limiter)
  - safe fallback responses when key is not configured

## Security Model
- JWT bearer token validation for protected API routes
- Admin-only operations for sensitive routes (workflow/program config, loyalty awards)
- Secret-header fallback for webhook/cron automation endpoints

## Deployment Notes (Vercel + Supabase)
- Set CRM_DATABASE_URL to Supabase Postgres connection string
- Set REDIS_URL to managed Redis
- Set JWT/Stripe/OpenAI/Pusher environment variables
- Run Prisma generate + migrations for prisma/crm/schema.prisma
- Run CRM worker as a separate process using npm run worker:crm
