import { ChannelType } from '@/generated/crm-client';
import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseEnumValue,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import { RetainService } from '@/src/crm/modules/retain';

const retainService = new RetainService();

type RequestReviewBody = {
  leadId?: string;
  channel?: string;
};

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<RequestReviewBody>(request);
    const leadId = parseOptionalString(body.leadId);

    if (!leadId) {
      return jsonResponse({ error: 'leadId is required' }, 400);
    }

    const reviewRequest = await retainService.requestReview({
      leadId,
      channel: parseEnumValue(body.channel, ChannelType, ChannelType.SMS),
    });

    return jsonResponse({ reviewRequest }, 201);
  });
}
