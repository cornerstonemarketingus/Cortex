import { ChannelType } from '@/generated/crm-client';
import { readJson } from '@/src/crm/core/api';
import {
  allowBearerOrSecret,
  jsonResponse,
  parseEnumValue,
  parseOptionalString,
  parseRecord,
  withApiHandler,
} from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';

const captureService = new LeadCaptureService();

type WebhookBody = {
  source?: string;
  channel?: string;
  direction?: 'INBOUND' | 'OUTBOUND';
  externalThreadId?: string;
  lead?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  content?: string;
  metadata?: unknown;
};

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await allowBearerOrSecret(request);

    const body = await readJson<WebhookBody>(request);
    const source = parseOptionalString(body.source) || 'external-webhook';
    const content = parseOptionalString(body.content);

    if (!content) {
      return jsonResponse({ error: 'content is required' }, 400);
    }

    const result = await captureService.ingestInboundMessage({
      source,
      channel: parseEnumValue(body.channel, ChannelType, ChannelType.WEBHOOK),
      direction: body.direction === 'OUTBOUND' ? 'OUTBOUND' : 'INBOUND',
      externalThreadId: parseOptionalString(body.externalThreadId),
      lead: {
        firstName: parseOptionalString(body.lead?.firstName),
        lastName: parseOptionalString(body.lead?.lastName),
        email: parseOptionalString(body.lead?.email),
        phone: parseOptionalString(body.lead?.phone),
      },
      content,
      metadata: parseRecord(body.metadata),
    });

    return jsonResponse({ result }, 201);
  });
}
