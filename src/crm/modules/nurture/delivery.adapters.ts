import { ChannelType } from '@/generated/crm-client';
import { ApiError } from '@/src/crm/core/api';

type DeliveryProvider = 'twilio' | 'sendgrid' | 'webhook' | 'mock' | 'internal';

type DeliveryStatus = 'sent' | 'queued' | 'skipped' | 'failed';

type DeliveryDispatchInput = {
  leadId: string;
  leadFirstName: string;
  leadLastName?: string | null;
  leadPhone?: string | null;
  leadEmail?: string | null;
  channel: ChannelType;
  content: string;
  source?: string;
  subject?: string;
  messageId: string;
  conversationId: string;
};

export type DeliveryDispatchResult = {
  provider: DeliveryProvider;
  channel: ChannelType;
  status: DeliveryStatus;
  attempts: number;
  transportId?: string;
  webhookUrl?: string;
  detail: string;
  error?: string;
  retryable?: boolean;
};

class DeliveryDispatchError extends Error {
  readonly status?: number;
  readonly retryable: boolean;

  constructor(message: string, options?: { status?: number; retryable?: boolean }) {
    super(message);
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
  }
}

const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

function trimEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('whatsapp:')) {
    return trimmed;
  }

  const cleaned = trimmed.replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAttempts(): number {
  const parsed = Number(trimEnv('CRM_DELIVERY_MAX_ATTEMPTS') || '3');
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(Math.floor(parsed), 5));
}

function resolveSmsProvider(): 'twilio' | 'webhook' | 'mock' {
  const raw = (trimEnv('CRM_SMS_PROVIDER') || 'twilio').toLowerCase();
  if (raw === 'webhook' || raw === 'mock' || raw === 'twilio') {
    return raw;
  }
  return 'twilio';
}

function shouldRetryStatus(status: number): boolean {
  return RETRYABLE_HTTP.has(status);
}

function buildTwilioCallbackUrl(messageId: string, leadId: string): string | undefined {
  const baseUrl =
    trimEnv('PUBLIC_APP_BASE_URL') ||
    trimEnv('NEXT_PUBLIC_APP_URL') ||
    trimEnv('APP_BASE_URL');

  if (!baseUrl) return undefined;

  const normalizedBase = baseUrl.replace(/\/$/, '');
  const url = new URL(`${normalizedBase}/api/crm/nurture/webhooks/twilio`);
  url.searchParams.set('messageId', messageId);
  url.searchParams.set('leadId', leadId);

  const webhookSecret = trimEnv('CRM_TWILIO_WEBHOOK_SECRET');
  if (webhookSecret) {
    url.searchParams.set('secret', webhookSecret);
  }

  return url.toString();
}

async function parseResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export class DeliveryAdapterService {
  async dispatchWithRetry(input: DeliveryDispatchInput): Promise<DeliveryDispatchResult> {
    const maxAttempts = parseRetryAttempts();
    let lastError: DeliveryDispatchError | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await this.dispatchOnce(input);
        return {
          ...result,
          attempts: attempt,
        };
      } catch (error) {
        const parsed =
          error instanceof DeliveryDispatchError
            ? error
            : new DeliveryDispatchError(error instanceof Error ? error.message : String(error));

        lastError = parsed;
        if (!parsed.retryable || attempt >= maxAttempts) {
          break;
        }

        // Exponential retry backoff for provider network and 5xx instability.
        const waitMs = Math.min(8000, 450 * 2 ** (attempt - 1));
        await delay(waitMs);
      }
    }

    return {
      provider: this.resolveProvider(input),
      channel: input.channel,
      status: 'failed',
      attempts: maxAttempts,
      detail: 'Delivery attempts exhausted.',
      error: lastError?.message || 'Unknown delivery error',
      retryable: lastError?.retryable,
    };
  }

  private resolveProvider(input: DeliveryDispatchInput): DeliveryProvider {
    if (input.channel === ChannelType.SMS) return resolveSmsProvider();
    if (input.channel === ChannelType.EMAIL) return 'sendgrid';

    const source = (input.source || '').toLowerCase();
    if (input.channel === ChannelType.SOCIAL && source.includes('whatsapp')) {
      return 'twilio';
    }

    return 'internal';
  }

  private async dispatchOnce(input: DeliveryDispatchInput): Promise<Omit<DeliveryDispatchResult, 'attempts'>> {
    if (input.channel === ChannelType.SMS) {
      return this.sendSmsByProvider(input);
    }

    if (input.channel === ChannelType.EMAIL) {
      return this.sendSendGridEmail(input);
    }

    if (input.channel === ChannelType.SOCIAL) {
      const source = (input.source || '').toLowerCase();
      if (source.includes('whatsapp')) {
        return this.sendTwilioWhatsApp(input);
      }

      if (source.includes('messenger')) {
        return {
          provider: 'internal',
          channel: input.channel,
          status: 'queued',
          detail: 'Messenger dispatch queued for connector worker ingestion.',
          transportId: input.messageId,
        };
      }
    }

    return {
      provider: 'internal',
      channel: input.channel,
      status: 'queued',
      detail: 'Delivery persisted in CRM conversation history.',
      transportId: input.messageId,
    };
  }

  private async sendSmsByProvider(
    input: DeliveryDispatchInput
  ): Promise<Omit<DeliveryDispatchResult, 'attempts'>> {
    const provider = resolveSmsProvider();

    if (provider === 'mock') {
      return this.sendMockSms(input);
    }

    if (provider === 'webhook') {
      return this.sendWebhookSms(input);
    }

    return this.sendTwilioSms(input);
  }

  private async sendWebhookSms(
    input: DeliveryDispatchInput
  ): Promise<Omit<DeliveryDispatchResult, 'attempts'>> {
    const targetUrl = trimEnv('CRM_SMS_WEBHOOK_URL');
    if (!targetUrl) {
      throw new DeliveryDispatchError('Missing CRM_SMS_WEBHOOK_URL for webhook SMS provider.', {
        retryable: false,
      });
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(trimEnv('CRM_SMS_WEBHOOK_SECRET')
          ? { 'x-crm-sms-webhook-secret': trimEnv('CRM_SMS_WEBHOOK_SECRET') as string }
          : {}),
      },
      body: JSON.stringify({
        leadId: input.leadId,
        phone: input.leadPhone,
        content: input.content,
        messageId: input.messageId,
        conversationId: input.conversationId,
        source: input.source || 'manual',
      }),
    });

    if (!response.ok) {
      const bodyText = await parseResponseText(response);
      throw new DeliveryDispatchError(`Webhook SMS dispatch failed (${response.status}): ${bodyText}`, {
        status: response.status,
        retryable: shouldRetryStatus(response.status),
      });
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: string; status?: string };
    return {
      provider: 'webhook',
      channel: input.channel,
      status: payload.status === 'queued' ? 'queued' : 'sent',
      detail: 'Webhook SMS provider accepted dispatch payload.',
      transportId: payload.id || input.messageId,
    };
  }

  private async sendMockSms(
    input: DeliveryDispatchInput
  ): Promise<Omit<DeliveryDispatchResult, 'attempts'>> {
    return {
      provider: 'mock',
      channel: input.channel,
      status: 'queued',
      detail: 'Mock SMS provider accepted dispatch payload for testing.',
      transportId: `mock-${input.messageId}`,
    };
  }

  private async sendTwilioSms(
    input: DeliveryDispatchInput
  ): Promise<Omit<DeliveryDispatchResult, 'attempts'>> {
    const accountSid = trimEnv('TWILIO_ACCOUNT_SID');
    const authToken = trimEnv('TWILIO_AUTH_TOKEN');
    const messagingServiceSid = trimEnv('TWILIO_MESSAGING_SERVICE_SID');
    const fromNumber = trimEnv('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken) {
      return {
        provider: 'internal',
        channel: input.channel,
        status: 'skipped',
        detail: 'Twilio credentials are not configured; message retained in CRM only.',
        transportId: input.messageId,
      };
    }

    const toPhone = normalizePhone(input.leadPhone);
    if (!toPhone) {
      throw new ApiError(400, 'Lead phone is required for SMS delivery', 'SMS_PHONE_REQUIRED');
    }

    if (!messagingServiceSid && !fromNumber) {
      throw new DeliveryDispatchError('Missing TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER.', {
        retryable: false,
      });
    }

    const statusCallback = buildTwilioCallbackUrl(input.messageId, input.leadId);

    const body = new URLSearchParams();
    body.set('To', toPhone);
    body.set('Body', input.content);
    if (messagingServiceSid) {
      body.set('MessagingServiceSid', messagingServiceSid);
    }
    if (fromNumber) {
      body.set('From', fromNumber);
    }
    if (statusCallback) {
      body.set('StatusCallback', statusCallback);
    }

    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const bodyText = await parseResponseText(response);
      throw new DeliveryDispatchError(`Twilio SMS dispatch failed (${response.status}): ${bodyText}`, {
        status: response.status,
        retryable: shouldRetryStatus(response.status),
      });
    }

    const payload = (await response.json().catch(() => ({}))) as {
      sid?: string;
      status?: string;
    };

    const status = (payload.status || '').toLowerCase();
    return {
      provider: 'twilio',
      channel: input.channel,
      status: status === 'queued' ? 'queued' : 'sent',
      detail: 'Twilio SMS accepted for delivery.',
      transportId: payload.sid,
      webhookUrl: statusCallback,
    };
  }

  private async sendTwilioWhatsApp(
    input: DeliveryDispatchInput
  ): Promise<Omit<DeliveryDispatchResult, 'attempts'>> {
    const accountSid = trimEnv('TWILIO_ACCOUNT_SID');
    const authToken = trimEnv('TWILIO_AUTH_TOKEN');
    const fromNumber = trimEnv('TWILIO_WHATSAPP_FROM') || trimEnv('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return {
        provider: 'internal',
        channel: input.channel,
        status: 'skipped',
        detail: 'WhatsApp connector not configured; event retained in CRM.',
        transportId: input.messageId,
      };
    }

    const normalizedPhone = normalizePhone(input.leadPhone);
    if (!normalizedPhone) {
      throw new ApiError(400, 'Lead phone is required for WhatsApp dispatch', 'WHATSAPP_PHONE_REQUIRED');
    }

    const to = normalizedPhone.startsWith('whatsapp:') ? normalizedPhone : `whatsapp:${normalizedPhone}`;
    const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
    const statusCallback = buildTwilioCallbackUrl(input.messageId, input.leadId);

    const body = new URLSearchParams();
    body.set('To', to);
    body.set('From', from);
    body.set('Body', input.content);
    if (statusCallback) {
      body.set('StatusCallback', statusCallback);
    }

    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const bodyText = await parseResponseText(response);
      throw new DeliveryDispatchError(`Twilio WhatsApp dispatch failed (${response.status}): ${bodyText}`, {
        status: response.status,
        retryable: shouldRetryStatus(response.status),
      });
    }

    const payload = (await response.json().catch(() => ({}))) as {
      sid?: string;
      status?: string;
    };

    const status = (payload.status || '').toLowerCase();
    return {
      provider: 'twilio',
      channel: input.channel,
      status: status === 'queued' ? 'queued' : 'sent',
      detail: 'Twilio WhatsApp accepted for delivery.',
      transportId: payload.sid,
      webhookUrl: statusCallback,
    };
  }

  private async sendSendGridEmail(
    input: DeliveryDispatchInput
  ): Promise<Omit<DeliveryDispatchResult, 'attempts'>> {
    const apiKey = trimEnv('SENDGRID_API_KEY');
    const fromEmail = trimEnv('SENDGRID_FROM_EMAIL') || 'no-reply@cortex.local';
    const fromName = trimEnv('SENDGRID_FROM_NAME') || 'Cortex';

    if (!apiKey) {
      return {
        provider: 'internal',
        channel: input.channel,
        status: 'skipped',
        detail: 'SendGrid is not configured; message retained in CRM only.',
        transportId: input.messageId,
      };
    }

    const toEmail = input.leadEmail?.trim();
    if (!toEmail) {
      throw new ApiError(400, 'Lead email is required for email delivery', 'EMAIL_REQUIRED');
    }

    const payload = {
      personalizations: [
        {
          to: [{ email: toEmail }],
          custom_args: {
            messageId: input.messageId,
            conversationId: input.conversationId,
            leadId: input.leadId,
            source: input.source || 'manual',
          },
        },
      ],
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: input.subject || 'Cortex automation update',
      content: [
        {
          type: 'text/plain',
          value: input.content,
        },
      ],
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const bodyText = await parseResponseText(response);
      throw new DeliveryDispatchError(`SendGrid dispatch failed (${response.status}): ${bodyText}`, {
        status: response.status,
        retryable: shouldRetryStatus(response.status),
      });
    }

    return {
      provider: 'sendgrid',
      channel: input.channel,
      status: 'queued',
      detail: 'SendGrid accepted email for processing.',
      transportId: response.headers.get('x-message-id') || undefined,
    };
  }
}
