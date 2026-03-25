import { ChannelType } from '@/generated/crm-client';
import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { crmDb } from '@/src/crm/core/crmDb';
import {
  allowBearerOrSecret,
  jsonResponse,
  parseBoolean,
  parseOptionalString,
  parseRecord,
  withApiHandler,
} from '@/src/crm/core/http';
import { toPrismaJson } from '@/src/crm/core/json';
import { callOpenAiChat } from '@/src/crm/core/openai';
import { LeadCaptureService } from '@/src/crm/modules/capture';

export const runtime = 'nodejs';

const captureService = new LeadCaptureService();

type VoiceBody = {
  action?: unknown;
  leadId?: unknown;
  objective?: unknown;
  transcript?: unknown;
  fromNumber?: unknown;
  toNumber?: unknown;
  durationSec?: unknown;
  wasMissed?: unknown;
  metadata?: unknown;
};

async function summarizeTranscript(transcript: string, objective?: string): Promise<string> {
  return callOpenAiChat(
    [
      {
        role: 'user',
        content: [
          'Summarize this call transcript for CRM handoff.',
          objective ? `Business objective: ${objective}` : 'Business objective: qualification + next best action.',
          'Return concise summary with action items and urgency signal.',
          '',
          transcript,
        ].join('\n'),
      },
    ],
    'support'
  );
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<VoiceBody>(request);
    const action = parseOptionalString(typeof body.action === 'string' ? body.action : undefined) || 'handoff-summary';

    if (action === 'inbound-call') {
      await allowBearerOrSecret(request, {
        envName: 'CRM_VOICE_WEBHOOK_SECRET',
        headerName: 'x-crm-voice-secret',
      });

      const fromNumber = parseOptionalString(typeof body.fromNumber === 'string' ? body.fromNumber : undefined);
      if (!fromNumber) {
        return jsonResponse({ error: 'fromNumber is required for inbound-call action' }, 400);
      }

      const transcript = parseOptionalString(typeof body.transcript === 'string' ? body.transcript : undefined);
      const objective = parseOptionalString(typeof body.objective === 'string' ? body.objective : undefined);

      const call = await captureService.logInboundCall({
        fromNumber,
        toNumber: parseOptionalString(typeof body.toNumber === 'string' ? body.toNumber : undefined),
        durationSec: Number.isFinite(Number(body.durationSec)) ? Number(body.durationSec) : 0,
        wasMissed: parseBoolean(body.wasMissed, false),
        metadata: {
          ...parseRecord(body.metadata),
          transcript,
        },
      });

      let handoffSummary: string | null = null;
      if (transcript) {
        handoffSummary = await summarizeTranscript(transcript, objective);
      }

      if (call.leadId && handoffSummary) {
        await crmDb.interaction.create({
          data: {
            leadId: call.leadId,
            type: 'voice_handoff_summary',
            channel: ChannelType.CALL,
            payload: toPrismaJson({
              callId: call.id,
              summary: handoffSummary,
              objective,
            }),
          },
        });
      }

      return jsonResponse({
        call,
        handoffSummary,
      }, 201);
    }

    await requireCrmAuth(request);

    if (action === 'outbound-script') {
      const leadId = parseOptionalString(typeof body.leadId === 'string' ? body.leadId : undefined);
      if (!leadId) {
        return jsonResponse({ error: 'leadId is required for outbound-script action' }, 400);
      }

      const objective =
        parseOptionalString(typeof body.objective === 'string' ? body.objective : undefined) ||
        'Book a qualified follow-up call.';

      const lead = await crmDb.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return jsonResponse({ error: 'Lead not found' }, 404);
      }

      const script = await callOpenAiChat(
        [
          {
            role: 'user',
            content: [
              'Create a short outbound voice script.',
              `Lead: ${lead.firstName} ${lead.lastName || ''}`.trim(),
              `Objective: ${objective}`,
              `Context email: ${lead.email || 'n/a'}`,
              `Context phone: ${lead.phone || 'n/a'}`,
              'Structure: opener, value statement, one discovery question, CTA, fallback voicemail line.',
            ].join('\n'),
          },
        ],
        'sales'
      );

      return jsonResponse({
        leadId,
        objective,
        script,
      });
    }

    if (action === 'handoff-summary') {
      const transcript = parseOptionalString(typeof body.transcript === 'string' ? body.transcript : undefined);
      if (!transcript) {
        return jsonResponse({ error: 'transcript is required for handoff-summary action' }, 400);
      }

      const objective = parseOptionalString(typeof body.objective === 'string' ? body.objective : undefined);
      const summary = await summarizeTranscript(transcript, objective);

      return jsonResponse({
        summary,
      });
    }

    return jsonResponse(
      {
        error: 'Unsupported action. Use inbound-call, outbound-script, or handoff-summary.',
      },
      400
    );
  });
}
