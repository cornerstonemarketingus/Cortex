import { ChannelType, LeadSourceType } from '@/generated/crm-client';
import { readJson } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';
import { NurtureService } from '@/src/crm/modules/nurture';

type ChatBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  sourceName?: string;
  message?: string;
  tone?: 'friendly' | 'sales' | 'support';
};

const captureService = new LeadCaptureService();
const nurtureService = new NurtureService();

function parseTone(value: unknown): 'friendly' | 'sales' | 'support' {
  return value === 'sales' || value === 'support' ? value : 'friendly';
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<ChatBody>(request);

    const firstName = parseOptionalString(body.firstName) || 'Website Visitor';
    const message = parseOptionalString(body.message);
    const email = parseOptionalString(body.email);
    const phone = parseOptionalString(body.phone);

    if (!message) {
      return jsonResponse({ error: 'message is required' }, 400);
    }

    if (!email && !phone) {
      return jsonResponse({ error: 'email or phone is required for chat capture' }, 400);
    }

    const lead = await captureService.createLead({
      firstName,
      lastName: parseOptionalString(body.lastName),
      email,
      phone,
      sourceType: LeadSourceType.CHAT_WIDGET,
      sourceName: parseOptionalString(body.sourceName) || 'chat-widget',
      firstMessage: message,
      firstMessageChannel: ChannelType.CHAT,
    });

    const inbound = await captureService.ingestInboundMessage({
      source: 'chat-widget',
      channel: ChannelType.CHAT,
      direction: 'INBOUND',
      lead: {
        firstName: lead.firstName,
        lastName: lead.lastName || undefined,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
      },
      content: message,
      metadata: {
        leadId: lead.id,
      },
    });

    const aiReply = await nurtureService.generateAutoReply(
      inbound.conversation.id,
      parseTone(body.tone)
    );

    return jsonResponse({
      lead,
      conversationId: inbound.conversation.id,
      aiReply,
    }, 201);
  });
}
