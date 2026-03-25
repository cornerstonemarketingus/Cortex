import { readJson } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { RetainService } from '@/src/crm/modules/retain';

const retainService = new RetainService();

type TrackReferralBody = {
  eventType?: 'click' | 'conversion';
  valueCents?: number;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  return withApiHandler(async () => {
    const { code } = await params;
    const body = await readJson<TrackReferralBody>(request);

    const eventType = body.eventType === 'conversion' ? 'conversion' : 'click';

    if (eventType === 'conversion') {
      const valueCents = Number(body.valueCents);
      const link = await retainService.trackReferralConversion(
        code,
        Number.isFinite(valueCents) ? Math.floor(valueCents) : undefined
      );
      return jsonResponse({ link, eventType: 'conversion' }, 201);
    }

    const link = await retainService.trackReferralClick(code);
    return jsonResponse({ link, eventType: 'click' }, 201);
  });
}
