import { ChannelType } from '@/generated/crm-client';
import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  allowBearerOrSecret,
  jsonResponse,
  parseBoolean,
  parseOptionalString,
  parseRecord,
  withApiHandler,
} from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';
import { NurtureService } from '@/src/crm/modules/nurture';

const nurtureService = new NurtureService();
const captureService = new LeadCaptureService();

type SocialBody = {
  action?: unknown;
  platform?: unknown;
  leadId?: unknown;
  content?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  externalThreadId?: unknown;
  metadata?: unknown;
  autoReply?: unknown;
};

function parsePlatform(value: unknown): 'whatsapp' | 'messenger' {
  const normalized = parseOptionalString(typeof value === 'string' ? value : undefined)?.toLowerCase();
  return normalized === 'messenger' ? 'messenger' : 'whatsapp';
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<SocialBody>(request);
    const action = parseOptionalString(typeof body.action === 'string' ? body.action : undefined) || 'send';
    const platform = parsePlatform(body.platform);

    if (action === 'ingest') {
      await allowBearerOrSecret(request, {
        envName: 'CRM_SOCIAL_WEBHOOK_SECRET',
        headerName: 'x-crm-social-secret',
      });

      const content = parseOptionalString(typeof body.content === 'string' ? body.content : undefined);
      const phone = parseOptionalString(typeof body.phone === 'string' ? body.phone : undefined);
      const email = parseOptionalString(typeof body.email === 'string' ? body.email : undefined);
      const firstName = parseOptionalString(typeof body.firstName === 'string' ? body.firstName : undefined) || 'Social';
      const lastName = parseOptionalString(typeof body.lastName === 'string' ? body.lastName : undefined);

      if (!content) {
        return jsonResponse({ error: 'content is required for ingest action' }, 400);
      }

      const result = await captureService.ingestInboundMessage({
        source: `social-${platform}`,
        channel: ChannelType.SOCIAL,
        direction: 'INBOUND',
        externalThreadId: parseOptionalString(
          typeof body.externalThreadId === 'string' ? body.externalThreadId : undefined
        ),
        lead: {
          firstName,
          lastName,
          phone,
          email,
        },
        content,
        metadata: {
          platform,
          ...parseRecord(body.metadata),
        },
      });

      return jsonResponse({ result }, 201);
    }

    await requireCrmAuth(request);

    const leadId = parseOptionalString(typeof body.leadId === 'string' ? body.leadId : undefined);
    const content = parseOptionalString(typeof body.content === 'string' ? body.content : undefined);

    if (!leadId || !content) {
      return jsonResponse({ error: 'leadId and content are required for send action' }, 400);
    }

    const result = await nurtureService.sendMessage({
      leadId,
      channel: ChannelType.SOCIAL,
      content,
      source: platform,
      autoReply: parseBoolean(body.autoReply, false),
      tone: 'friendly',
    });

    return jsonResponse({ result }, 201);
  });
}
