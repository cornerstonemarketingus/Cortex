import { ChannelType } from '@/generated/crm-client';
import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseBoolean,
  parseEnumValue,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import { NurtureService } from '@/src/crm/modules/nurture';

const nurtureService = new NurtureService();

type SendMessageBody = {
  leadId?: string;
  channel?: string;
  content?: string;
  subject?: string;
  source?: string;
  tone?: string;
  autoReply?: unknown;
};

function parseTone(value: unknown): 'friendly' | 'sales' | 'support' {
  if (value === 'friendly' || value === 'sales' || value === 'support') {
    return value;
  }
  return 'friendly';
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<SendMessageBody>(request);
    const leadId = parseOptionalString(body.leadId);
    const content = parseOptionalString(body.content);

    if (!leadId || !content) {
      return jsonResponse({ error: 'leadId and content are required' }, 400);
    }

    const result = await nurtureService.sendMessage({
      leadId,
      channel: parseEnumValue(body.channel, ChannelType, ChannelType.SMS),
      content,
      subject: parseOptionalString(body.subject),
      source: parseOptionalString(body.source),
      tone: parseTone(body.tone),
      autoReply: parseBoolean(body.autoReply, false),
    });

    return jsonResponse({ result }, 201);
  });
}
