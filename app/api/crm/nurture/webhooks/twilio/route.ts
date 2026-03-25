import { ChannelType } from '@/generated/crm-client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from '@/src/crm/core/api';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { toPrismaJson } from '@/src/crm/core/json';
import { LeadCaptureService } from '@/src/crm/modules/capture';
import { NurtureService } from '@/src/crm/modules/nurture';
import { extractTenantId } from '@/src/platform/tenant-enforcement';

export const runtime = 'nodejs';

const captureService = new LeadCaptureService();
const nurtureService = new NurtureService();

type DeliveryUpdatePatch = {
  provider: 'twilio';
  providerMessageId?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  to?: string;
  from?: string;
  updatedAt: string;
};

function getFormValue(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePhone(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('whatsapp:')) {
    return value;
  }

  const cleaned = value.replace(/[^\d+]/g, '').trim();
  if (!cleaned) return undefined;
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function mergeDeliveryMetadata(existingMetadata: unknown, patch: DeliveryUpdatePatch): Record<string, unknown> {
  const base = asRecord(existingMetadata);
  const existingDelivery = asRecord(base.delivery);
  const deliveryTimeline = Array.isArray(base.deliveryTimeline)
    ? [...base.deliveryTimeline]
    : [];

  deliveryTimeline.push({
    provider: 'twilio',
    status: patch.status || 'unknown',
    providerMessageId: patch.providerMessageId,
    errorCode: patch.errorCode,
    errorMessage: patch.errorMessage,
    at: patch.updatedAt,
  });

  return {
    ...base,
    delivery: {
      ...existingDelivery,
      ...patch,
      provider: 'twilio',
    },
    deliveryTimeline: deliveryTimeline.slice(-20),
  };
}

function buildTwilioSignature(url: string, form: FormData, authToken: string): string {
  const keys = Array.from(new Set(Array.from(form.keys()))).sort();
  let payload = url;
  for (const key of keys) {
    const values = form.getAll(key).map((value) => (typeof value === 'string' ? value : '')).sort();
    for (const value of values) {
      payload += `${key}${value}`;
    }
  }

  return createHmac('sha1', authToken).update(payload).digest('base64');
}

function secureEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function shouldAutoRespond(body: string): boolean {
  const normalized = body.trim().toLowerCase();
  if (!normalized) return false;
  if (['stop', 'unsubscribe', 'cancel'].some((term) => normalized === term)) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const url = new URL(request.url);
    const configuredSecret = parseOptionalString(process.env.CRM_TWILIO_WEBHOOK_SECRET);
    if (configuredSecret) {
      const querySecret = parseOptionalString(url.searchParams.get('secret'));
      const headerSecret = parseOptionalString(request.headers.get('x-crm-webhook-secret') || undefined);
      if (querySecret !== configuredSecret && headerSecret !== configuredSecret) {
        throw new ApiError(401, 'Unauthorized Twilio webhook request', 'UNAUTHORIZED_TWILIO_WEBHOOK');
      }
    }

    const form = await request.formData();
    const twilioAuthToken = parseOptionalString(process.env.TWILIO_AUTH_TOKEN);
    const twilioSignature = parseOptionalString(request.headers.get('x-twilio-signature') || undefined);
    if (twilioAuthToken && twilioSignature) {
      const expectedSignature = buildTwilioSignature(url.toString(), form, twilioAuthToken);
      if (!secureEqual(expectedSignature, twilioSignature)) {
        throw new ApiError(401, 'Invalid Twilio signature', 'INVALID_TWILIO_SIGNATURE');
      }
    }

    const messageSid = getFormValue(form, 'MessageSid') || getFormValue(form, 'SmsSid');
    const messageStatus =
      (getFormValue(form, 'MessageStatus') || getFormValue(form, 'SmsStatus') || '').toLowerCase();
    const body = getFormValue(form, 'Body');
    const from = normalizePhone(getFormValue(form, 'From'));
    const to = normalizePhone(getFormValue(form, 'To'));
    const errorCode = getFormValue(form, 'ErrorCode');
    const errorMessage = getFormValue(form, 'ErrorMessage');

    const messageId = parseOptionalString(url.searchParams.get('messageId'));
    const leadIdHint = parseOptionalString(url.searchParams.get('leadId'));
    const tenantHint = parseOptionalString(url.searchParams.get('tenantId')) || parseOptionalString(request.headers.get('x-tenant-id') || undefined);

    let inboundResult: unknown;
    let autoResponseMessageId: string | null = null;
    const shouldTreatAsInbound = messageStatus === 'received' || messageStatus === 'inbound';

    if (shouldTreatAsInbound && body && from) {
      inboundResult = await captureService.ingestInboundMessage({
        source: 'twilio-sms',
        channel: ChannelType.SMS,
        direction: 'INBOUND',
        externalThreadId: messageSid,
        lead: {
          firstName: 'Inbound',
          phone: from,
        },
        content: body,
        metadata: {
          provider: 'twilio',
          to,
          messageStatus,
          messageSid,
        },
      });

      if (shouldAutoRespond(body)) {
        const inboundConversation = (inboundResult as { conversation?: { id?: string; leadId?: string } } | null)
          ?.conversation;
        const leadId = inboundConversation?.leadId;
        if (leadId) {
          const recentOutbound = await crmDb.conversationMessage.findFirst({
            where: {
              conversationId: inboundConversation.id,
              direction: 'OUTBOUND',
              createdAt: {
                gte: new Date(Date.now() - 2 * 60 * 1000),
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (!recentOutbound) {
            const auto = await nurtureService.sendMessage({
              leadId,
              channel: ChannelType.SMS,
              content:
                'Thanks for your message. We got it and will send a detailed next step shortly. Reply with your project ZIP and timeline to speed things up.',
              source: 'twilio-inbound-auto-reply',
              autoReply: false,
            });
            autoResponseMessageId = auto.outbound.id;
          }
        }
      }
    }

    let updatedMessageId: string | undefined;
    let tenantId: string | undefined = tenantHint;
    if (messageId) {
      const message = await crmDb.conversationMessage.findUnique({
        where: {
          id: messageId,
        },
        include: {
          conversation: {
            include: {
              lead: {
                select: {
                  metadata: true,
                },
              },
            },
          },
        },
      });

      if (message) {
        if (!tenantId) {
          tenantId = extractTenantId(message.conversation.lead.metadata);
        }

        const patch: DeliveryUpdatePatch = {
          provider: 'twilio',
          providerMessageId: messageSid,
          status: messageStatus,
          errorCode,
          errorMessage,
          to,
          from,
          updatedAt: new Date().toISOString(),
        };

        const metadata = mergeDeliveryMetadata(message.metadata, patch);

        await crmDb.conversationMessage.update({
          where: {
            id: message.id,
          },
          data: {
            metadata: toPrismaJson(metadata),
          },
        });

        await crmDb.interaction.create({
          data: {
            leadId: message.conversation.leadId,
            type: 'twilio_status_webhook',
            channel: ChannelType.SMS,
            payload: toPrismaJson({
              tenantId,
              messageId: message.id,
              providerMessageId: messageSid,
              status: messageStatus,
              errorCode,
              errorMessage,
              to,
              from,
            }),
          },
        });

        updatedMessageId = message.id;
      }
    }

    if (!updatedMessageId && leadIdHint && messageStatus) {
      if (!tenantId) {
        const lead = await crmDb.lead.findUnique({
          where: { id: leadIdHint },
          select: { metadata: true },
        });
        if (lead) {
          tenantId = extractTenantId(lead.metadata);
        }
      }

      await crmDb.interaction.create({
        data: {
          leadId: leadIdHint,
          type: 'twilio_status_webhook',
          channel: ChannelType.SMS,
          payload: toPrismaJson({
            tenantId,
            providerMessageId: messageSid,
            status: messageStatus,
            errorCode,
            errorMessage,
            to,
            from,
          }),
        },
      });
    }

    return jsonResponse({
      ok: true,
      provider: 'twilio',
      tenantId: tenantId || null,
      messageStatus,
      providerMessageId: messageSid,
      updatedMessageId,
      inboundCaptured: Boolean(inboundResult),
      autoResponseMessageId,
    });
  });
}
