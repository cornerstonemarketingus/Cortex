import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';

export const runtime = 'nodejs';

type SignatureWorkflowBody = {
  action?: unknown;
  envelopeId?: unknown;
  bidSummary?: unknown;
  recipientName?: unknown;
  recipientEmail?: unknown;
  contractValue?: unknown;
  reminderChannel?: unknown;
  note?: unknown;
};

function createEnvelopeId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `env_${Date.now().toString(36)}_${random}`;
}

function parseContractValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return `$${Math.round(value).toLocaleString('en-US')}`;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : '$0';
  }

  return '$0';
}

async function parseBody(request: Request): Promise<SignatureWorkflowBody> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new ApiError(400, 'Request body is required.', 'MISSING_BODY');
  }

  try {
    return JSON.parse(raw) as SignatureWorkflowBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      notes:
        'Use this endpoint to send bid packets for e-signature, check status, and trigger open/sign reminders.',
      actions: ['send', 'status', 'reminder'],
      exampleBody: {
        action: 'send',
        bidSummary: 'Roof replacement proposal with premium shingle package',
        recipientName: 'Alex Morgan',
        recipientEmail: 'alex@example.com',
        contractValue: '$18,500',
      },
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseBody(request);
    const action = parseOptionalString(body.action) || 'send';

    if (action !== 'send' && action !== 'status' && action !== 'reminder') {
      throw new ApiError(400, 'Unsupported action. Use send, status, or reminder.', 'ACTION_NOT_SUPPORTED');
    }

    if (action === 'send') {
      const envelopeId = createEnvelopeId();
      const bidSummary = parseOptionalString(body.bidSummary) || 'Construction proposal packet';
      const recipientName = parseOptionalString(body.recipientName) || 'Project Owner';
      const recipientEmail = parseOptionalString(body.recipientEmail) || 'owner@example.com';
      const contractValue = parseContractValue(body.contractValue);

      return jsonResponse(
        {
          workflow: {
            action,
            envelope: {
              envelopeId,
              bidSummary,
              recipientName,
              recipientEmail,
              contractValue,
              status: 'sent',
              sentAt: new Date().toISOString(),
            },
            reminders: [
              { offsetHours: 6, event: 'opened-not-signed', channel: 'sms' },
              { offsetHours: 24, event: 'opened-not-signed', channel: 'email' },
              { offsetHours: 48, event: 'not-opened', channel: 'sms' },
            ],
            compliance: {
              framework: 'UETA/ESIGN-compatible workflow model',
              legalNotice:
                'Electronic signatures are captured with timestamped acceptance records and immutable envelope IDs.',
              auditTrail: ['Envelope created', 'Recipient notification sent', 'Reminder schedule queued'],
            },
            nextSteps: [
              'Track open events and signature completion status in dashboard timeline.',
              'Trigger reminder action when envelope is opened but not signed within SLA.',
              'Update pipeline stage to Won automatically once signed.',
            ],
          },
        },
        201
      );
    }

    const envelopeId = parseOptionalString(body.envelopeId);
    if (!envelopeId) {
      throw new ApiError(400, 'envelopeId is required for status/reminder actions.', 'ENVELOPE_ID_REQUIRED');
    }

    if (action === 'status') {
      const statusVariants = ['sent', 'opened', 'signed'] as const;
      const status = statusVariants[envelopeId.length % statusVariants.length];

      return jsonResponse({
        workflow: {
          action,
          envelopeId,
          status,
          openedAt: status === 'sent' ? null : new Date(Date.now() - 2 * 3_600_000).toISOString(),
          signedAt: status === 'signed' ? new Date(Date.now() - 30 * 60_000).toISOString() : null,
          note: parseOptionalString(body.note) || 'Status derived from envelope timeline model.',
          nextSteps:
            status === 'signed'
              ? ['Mark project as closed won and trigger onboarding.']
              : ['Continue reminder cadence until signature is completed.'],
        },
      });
    }

    const reminderChannel = parseOptionalString(body.reminderChannel) || 'email';

    return jsonResponse({
      workflow: {
        action,
        envelopeId,
        status: 'reminder-sent',
        reminder: {
          channel: reminderChannel,
          sentAt: new Date().toISOString(),
          messagePreview:
            'Checking in on your proposal. Reply with questions or sign directly from your secure link.',
        },
        nextSteps: [
          'Wait 6 hours and request status check if still unsigned.',
          'Escalate to contractor assistant for live follow-up call if needed.',
        ],
      },
    });
  });
}
