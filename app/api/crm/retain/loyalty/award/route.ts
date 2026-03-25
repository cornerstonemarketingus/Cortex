import { LoyaltyEventType } from '@/generated/crm-client';
import { readJson } from '@/src/crm/core/api';
import { requireCrmAdmin } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseEnumValue,
  parseRecord,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import { RetainService } from '@/src/crm/modules/retain';

const retainService = new RetainService();

type AwardBody = {
  leadId?: string;
  type?: string;
  points?: number;
  metadata?: unknown;
};

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAdmin(request);

    const body = await readJson<AwardBody>(request);
    const leadId = parseOptionalString(body.leadId);
    const points = Math.floor(Number(body.points));

    if (!leadId || !Number.isFinite(points) || points === 0) {
      return jsonResponse({ error: 'leadId and non-zero points are required' }, 400);
    }

    const account = await retainService.awardLoyaltyPoints({
      leadId,
      type: parseEnumValue(body.type, LoyaltyEventType, LoyaltyEventType.EARN),
      points,
      metadata: parseRecord(body.metadata),
    });

    return jsonResponse({ account }, 201);
  });
}
