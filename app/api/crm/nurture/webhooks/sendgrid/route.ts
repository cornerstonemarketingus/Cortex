import { ChannelType } from '@/generated/crm-client';
import { ApiError, readJson } from '@/src/crm/core/api';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { toPrismaJson } from '@/src/crm/core/json';

export const runtime = 'nodejs';

type SendGridEvent = {
  event?: unknown;
  email?: unknown;
  reason?: unknown;
  timestamp?: unknown;
  sg_message_id?: unknown;
  custom_args?: unknown;
  [key: string]: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function appendSendGridTimeline(existingMetadata: unknown, event: Record<string, unknown>): Record<string, unknown> {
  const base = asRecord(existingMetadata);
  const delivery = asRecord(base.delivery);
  const timeline = Array.isArray(base.deliveryTimeline) ? [...base.deliveryTimeline] : [];

  timeline.push(event);

  return {
    ...base,
    delivery: {
      ...delivery,
      provider: 'sendgrid',
      status: event.status,
      providerMessageId: event.providerMessageId,
      updatedAt: event.at,
      reason: event.reason,
    },
    deliveryTimeline: timeline.slice(-20),
  };
}

function normalizeEvents(payload: unknown): SendGridEvent[] {
  if (Array.isArray(payload)) {
    return payload.filter((item) => item && typeof item === 'object') as SendGridEvent[];
  }

  if (payload && typeof payload === 'object') {
    return [payload as SendGridEvent];
  }

  return [];
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const configuredSecret = parseOptionalString(process.env.CRM_SENDGRID_WEBHOOK_SECRET);
    if (configuredSecret) {
      const incomingSecret =
        parseOptionalString(request.headers.get('x-crm-webhook-secret') || undefined) ||
        parseOptionalString(new URL(request.url).searchParams.get('secret'));
      if (incomingSecret !== configuredSecret) {
        throw new ApiError(401, 'Unauthorized SendGrid webhook request', 'UNAUTHORIZED_SENDGRID_WEBHOOK');
      }
    }

    const payload = await readJson<unknown>(request);
    const events = normalizeEvents(payload);

    let processed = 0;
    let updatedMessages = 0;
    let loggedInteractions = 0;

    for (const rawEvent of events) {
      processed += 1;
      const customArgs = asRecord(rawEvent.custom_args);
      const messageId = parseOptionalString(
        typeof customArgs.messageId === 'string' ? customArgs.messageId : undefined
      );
      const leadId = parseOptionalString(
        typeof customArgs.leadId === 'string' ? customArgs.leadId : undefined
      );

      const status = parseOptionalString(typeof rawEvent.event === 'string' ? rawEvent.event : undefined) || 'unknown';
      const providerMessageId =
        parseOptionalString(typeof rawEvent.sg_message_id === 'string' ? rawEvent.sg_message_id : undefined) ||
        parseOptionalString(typeof customArgs.providerMessageId === 'string' ? customArgs.providerMessageId : undefined);
      const reason = parseOptionalString(typeof rawEvent.reason === 'string' ? rawEvent.reason : undefined);
      const email = parseOptionalString(typeof rawEvent.email === 'string' ? rawEvent.email : undefined);
      const at =
        Number.isFinite(Number(rawEvent.timestamp))
          ? new Date(Number(rawEvent.timestamp) * 1000).toISOString()
          : new Date().toISOString();

      const timelineEvent = {
        provider: 'sendgrid',
        status,
        providerMessageId,
        reason,
        email,
        at,
      };

      let interactionLeadId = leadId;

      if (messageId) {
        const message = await crmDb.conversationMessage.findUnique({
          where: {
            id: messageId,
          },
          include: {
            conversation: true,
          },
        });

        if (message) {
          const metadata = appendSendGridTimeline(message.metadata, timelineEvent);
          await crmDb.conversationMessage.update({
            where: {
              id: message.id,
            },
            data: {
              metadata: toPrismaJson(metadata),
            },
          });

          interactionLeadId = message.conversation.leadId;
          updatedMessages += 1;
        }
      }

      if (interactionLeadId) {
        await crmDb.interaction.create({
          data: {
            leadId: interactionLeadId,
            type: 'sendgrid_event_webhook',
            channel: ChannelType.EMAIL,
            payload: toPrismaJson({
              messageId,
              providerMessageId,
              status,
              reason,
              email,
              at,
            }),
          },
        });
        loggedInteractions += 1;
      }
    }

    return jsonResponse({
      ok: true,
      provider: 'sendgrid',
      processed,
      updatedMessages,
      loggedInteractions,
    });
  });
}
