/**
 * SMS Service Abstraction Layer
 * Unified interface over SMS providers (Twilio, Telnyx, etc.)
 * Handles send, receive, AI-generate, and status tracking.
 */

import { llm } from '@/lib/llm/router';

export type SMSProvider = 'twilio' | 'telnyx' | 'signalwire' | 'mock';

export interface SMSSendRequest {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string;
  provider?: SMSProvider;
}

export interface SMSSendResult {
  success: boolean;
  messageId?: string;
  provider: SMSProvider;
  error?: string;
}

export interface SMSTemplate {
  id: string;
  name: string;
  trigger: string;
  body: string;
  variables?: string[];
}

export const SMS_TEMPLATES: SMSTemplate[] = [
  {
    id: 'estimate-ready',
    name: 'Estimate Ready',
    trigger: 'estimate_approved',
    body: 'Hi {{name}}! Your estimate from {{business}} is ready. View it here: {{link}}. Reply STOP to opt out.',
    variables: ['name', 'business', 'link'],
  },
  {
    id: 'missed-call',
    name: 'Missed Call Follow-Up',
    trigger: 'missed_call',
    body: 'Hi! Sorry we missed your call. This is {{business}}. How can we help? Reply here or call {{phone}}.',
    variables: ['business', 'phone'],
  },
  {
    id: 'appointment-reminder',
    name: 'Appointment Reminder',
    trigger: 'appointment_reminder',
    body: 'Reminder: Your appointment with {{business}} is tomorrow at {{time}}. Reply YES to confirm or call {{phone}}.',
    variables: ['business', 'time', 'phone'],
  },
  {
    id: 'review-request',
    name: 'Review Request',
    trigger: 'job_complete',
    body: 'Hi {{name}}, thanks for choosing {{business}}! Would you leave us a quick review? {{link}} — It means a lot to us!',
    variables: ['name', 'business', 'link'],
  },
  {
    id: 'invoice-sent',
    name: 'Invoice Sent',
    trigger: 'invoice_created',
    body: 'Hi {{name}}, your invoice #{{number}} for ${{amount}} is ready. Pay online: {{link}}. Questions? Reply here.',
    variables: ['name', 'number', 'amount', 'link'],
  },
  {
    id: 'lead-welcome',
    name: 'New Lead Welcome',
    trigger: 'form_submitted',
    body: 'Hi {{name}}! Thanks for reaching out to {{business}}. We\'ll contact you within 1 business day. Reply STOP to opt out.',
    variables: ['name', 'business'],
  },
];

/**
 * Fill template variables with actual values.
 */
export function fillTemplate(template: SMSTemplate, vars: Record<string, string>): string {
  let body = template.body;
  for (const [key, value] of Object.entries(vars)) {
    body = body.replaceAll(`{{${key}}}`, value);
  }
  return body;
}

/**
 * Validate a phone number (basic E.164 check).
 */
export function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{9,14}$/.test(phone.replace(/[\s\-().]/g, ''));
}

/**
 * Normalize phone to E.164 format.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Send an SMS via the configured provider.
 * Falls back to mock in development when credentials are absent.
 */
export async function sendSMS(req: SMSSendRequest): Promise<SMSSendResult> {
  const provider = req.provider ?? (process.env.SMS_PROVIDER as SMSProvider) ?? 'twilio';

  if (!isValidPhone(req.to)) {
    return { success: false, provider, error: 'Invalid phone number' };
  }

  const to = normalizePhone(req.to);

  try {
    if (provider === 'twilio') {
      return await sendViaTwilio({ ...req, to });
    }
    if (provider === 'telnyx') {
      return await sendViaTelnyx({ ...req, to });
    }
    // mock provider — always succeeds
    return { success: true, messageId: `mock_${Date.now()}`, provider: 'mock' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, provider, error: message };
  }
}

async function sendViaTwilio(req: SMSSendRequest): Promise<SMSSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = req.from || process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    return { success: false, provider: 'twilio', error: 'Missing Twilio credentials' };
  }

  const body = new URLSearchParams({ To: req.to, From: from, Body: req.body });
  if (req.mediaUrl) body.append('MediaUrl', req.mediaUrl);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) return { success: false, provider: 'twilio', error: data.message };
  return { success: true, messageId: data.sid, provider: 'twilio' };
}

async function sendViaTelnyx(req: SMSSendRequest): Promise<SMSSendResult> {
  const apiKey = process.env.TELNYX_API_KEY;
  const from = req.from || process.env.TELNYX_FROM_NUMBER;

  if (!apiKey || !from) {
    return { success: false, provider: 'telnyx', error: 'Missing Telnyx credentials' };
  }

  const res = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: req.to, text: req.body }),
  });

  const data = await res.json();
  if (!res.ok) return { success: false, provider: 'telnyx', error: data.errors?.[0]?.detail };
  return { success: true, messageId: data.data?.id, provider: 'telnyx' };
}

/**
 * AI-generate a personalized SMS message.
 */
export async function generateAISMS(
  context: { recipientName?: string; trigger: string; businessName: string; detail?: string }
): Promise<string> {
  const prompt = `Write a short SMS message (under 160 chars) for:
Business: ${context.businessName}
Trigger: ${context.trigger}
Recipient: ${context.recipientName || 'customer'}
${context.detail ? `Detail: ${context.detail}` : ''}

Be friendly, professional, and include a call to action. No markdown.`;

  const text = await llm(prompt, 'chat');
  return text.slice(0, 160);
}

/**
 * Get template by trigger event name.
 */
export function getTemplateByTrigger(trigger: string): SMSTemplate | null {
  return SMS_TEMPLATES.find((t) => t.trigger === trigger) ?? null;
}
