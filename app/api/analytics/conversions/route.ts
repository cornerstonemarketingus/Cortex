import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseLimit, withApiHandler } from '@/src/crm/core/http';
import {
  isLandingEventType,
  listRecentLandingEvents,
  recordLandingEvent,
  summarizeLandingEvents,
} from '@/src/analytics/landing-conversions';

export const runtime = 'nodejs';

type ConversionBody = {
  eventType?: unknown;
  variant?: unknown;
  ctaId?: unknown;
  metadata?: unknown;
};

async function parseBody(request: Request): Promise<ConversionBody> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new ApiError(400, 'Request body is required.', 'MISSING_BODY');
  }

  try {
    return JSON.parse(raw) as ConversionBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const limit = parseLimit(request, 30, 1, 200, 'recentLimit');

    const [summary, recentEvents] = await Promise.all([
      summarizeLandingEvents(),
      listRecentLandingEvents(limit),
    ]);

    return jsonResponse({
      summary,
      recentEvents,
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseBody(request);

    if (!isLandingEventType(body.eventType)) {
      throw new ApiError(400, 'Invalid conversion event type.', 'INVALID_EVENT_TYPE');
    }

    const [event, summary] = await Promise.all([
      recordLandingEvent({
        eventType: body.eventType,
        variant: body.variant,
        ctaId: body.ctaId,
        metadata: body.metadata,
      }),
      summarizeLandingEvents(),
    ]);

    return jsonResponse(
      {
        ok: true,
        event,
        summary,
      },
      201
    );
  });
}
