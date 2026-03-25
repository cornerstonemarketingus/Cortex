import { readJson } from '@/src/crm/core/api';
import {
  allowBearerOrSecret,
  jsonResponse,
  parseOptionalString,
  parseRecord,
  withApiHandler,
} from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';

const captureService = new LeadCaptureService();

type InboundCallBody = {
  fromNumber?: string;
  toNumber?: string;
  durationSec?: number;
  wasMissed?: boolean;
  campaignId?: string;
  metadata?: unknown;
};

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await allowBearerOrSecret(request);

    const body = await readJson<InboundCallBody>(request);
    const fromNumber = parseOptionalString(body.fromNumber);
    if (!fromNumber) {
      return jsonResponse({ error: 'fromNumber is required' }, 400);
    }

    const call = await captureService.logInboundCall({
      fromNumber,
      toNumber: parseOptionalString(body.toNumber),
      durationSec: Number.isFinite(Number(body.durationSec)) ? Number(body.durationSec) : 0,
      wasMissed: body.wasMissed === true,
      campaignId: parseOptionalString(body.campaignId),
      metadata: parseRecord(body.metadata),
    });

    return jsonResponse({ call }, 201);
  });
}
