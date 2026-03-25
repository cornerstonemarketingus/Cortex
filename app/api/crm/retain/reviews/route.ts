import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseEnumValue,
  parseLimit,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import { ChannelType } from '@/generated/crm-client';
import { RetainService } from '@/src/crm/modules/retain';

const retainService = new RetainService();

type CreateReviewBody = {
  leadId?: string;
  source?: string;
  rating?: number;
  comment?: string;
};

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const limit = parseLimit(request, 100, 1, 300);
    const reviews = await retainService.listReviews(limit);
    return jsonResponse({ reviews, count: reviews.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<CreateReviewBody>(request);
    const leadId = parseOptionalString(body.leadId);
    const source = parseOptionalString(body.source);
    const rating = Number(body.rating);

    if (!leadId || !source || !Number.isFinite(rating)) {
      return jsonResponse({ error: 'leadId, source, and numeric rating are required' }, 400);
    }

    const review = await retainService.createReview({
      leadId,
      source,
      rating,
      comment: parseOptionalString(body.comment),
    });

    return jsonResponse({ review }, 201);
  });
}
