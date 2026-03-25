import { ChannelType, LeadSourceType } from '@/generated/crm-client';
import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { crmDb } from '@/src/crm/core/crmDb';
import { LeadCaptureService } from '@/src/crm/modules/capture';
import { CloseService } from '@/src/crm/modules/close';
import { NurtureService } from '@/src/crm/modules/nurture';
import { RetainService } from '@/src/crm/modules/retain';
import { createBidEstimate } from '@/src/estimating/ai-takeoff';
import { enforceAutomationHealth } from '@/src/construction/automation-health.service';
import { getAutomationTemplates } from '@/src/construction/automation-templates.service';

type AutomationRequestBody = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  projectCategory?: unknown;
  zipCode?: unknown;
  scope?: unknown;
  triggerMissedCall?: unknown;
  sendReviewRequest?: unknown;
  runReengagement?: unknown;
};

const captureService = new LeadCaptureService();
const nurtureService = new NurtureService();
const closeService = new CloseService();
const retainService = new RetainService();

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      notes:
        'POST to execute core automation pack: instant SMS response, missed call text-back, AI chat reply, pipeline actions, estimate-to-invoice, review request, and re-engagement run.',
      fields: [
        'firstName',
        'email or phone',
        'scope',
        'projectCategory',
        'zipCode',
        'triggerMissedCall',
        'sendReviewRequest',
        'runReengagement',
      ],
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const health = await enforceAutomationHealth();
    const body = await readJson<AutomationRequestBody>(request);
    const templates = await getAutomationTemplates();

    const firstName = parseOptionalString(body.firstName) || 'Website Lead';
    const lastName = parseOptionalString(body.lastName);
    const email = parseOptionalString(body.email)?.toLowerCase();
    const phone = parseOptionalString(body.phone);
    const scope =
      parseOptionalString(body.scope) ||
      'Replace 2,000 sq ft asphalt roof with architectural shingles and standard flashing package.';
    const projectCategory = parseOptionalString(body.projectCategory) || 'roof-replacement';
    const zipCode = parseOptionalString(body.zipCode) || '55123';

    if (!email && !phone) {
      throw new ApiError(400, 'Provide email or phone to run lead automations.', 'CONTACT_REQUIRED');
    }

    const triggerMissedCall = parseBoolean(body.triggerMissedCall, true);
    const sendReviewRequest = parseBoolean(body.sendReviewRequest, true);
    const runReengagement = parseBoolean(body.runReengagement, true);

    const workflowSeed = await nurtureService.seedCoreAutomationPack({
      missedCallTextBack: templates.missedCallTextBack,
      stageFollowup: templates.stageFollowup,
    });

    const lead = await captureService.createLead({
      firstName,
      lastName,
      email,
      phone,
      sourceType: LeadSourceType.FORM,
      sourceName: 'automation-control-center',
      firstMessage: scope,
      firstMessageChannel: ChannelType.CHAT,
      metadata: {
        zipCode,
        projectCategory,
      },
      tags: ['automation-pack', projectCategory],
    });

    const startedAt = Date.now();

    const instantReply = await nurtureService.sendMessage({
      leadId: lead.id,
      channel: phone ? ChannelType.SMS : ChannelType.EMAIL,
      content: templates.instantLeadReply,
      source: 'automation-instant-reply',
      autoReply: false,
    });

    const chatInbound = await captureService.ingestInboundMessage({
      source: 'website-chat',
      channel: ChannelType.CHAT,
      direction: 'INBOUND',
      lead: {
        firstName: lead.firstName,
        lastName: lead.lastName || undefined,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
      },
      content: `Can you help me compare options for ${projectCategory}?`,
      metadata: {
        leadId: lead.id,
      },
    });

    const aiChatReply = await nurtureService.generateAutoReply(chatInbound.conversation.id, 'sales');

    const leadCreatedAutomation = await nurtureService.triggerWorkflows({
      triggerType: 'lead_created',
      leadId: lead.id,
      context: {
        isNewLead: true,
        firstName: lead.firstName,
        projectCategory,
      },
    });

    let missedCallAutomation: unknown = null;
    if (triggerMissedCall && phone) {
      await captureService.logInboundCall({
        fromNumber: phone,
        toNumber: process.env.CRM_DEFAULT_NUMBER || '+10000000000',
        durationSec: 0,
        wasMissed: true,
        metadata: {
          leadId: lead.id,
          source: 'automation-pack',
        },
      });

      missedCallAutomation = await nurtureService.triggerWorkflows({
        triggerType: 'missed_call',
        leadId: lead.id,
        context: {
          isNewLead: true,
          fromNumber: phone,
        },
      });
    }

    const estimate = createBidEstimate({
      description: scope,
      projectCategory,
      zipCode,
    });

    const proposal = await closeService.createProposal({
      leadId: lead.id,
      title: `${estimate.categoryLabel} Proposal`,
      lineItems: [
        {
          label: `${estimate.categoryLabel} scope`,
          quantity: 1,
          unitPriceCents: Math.max(100, Math.round(estimate.totals.grandTotal * 100)),
        },
      ],
      notes: `Generated by automation pack at ${new Date().toISOString()}`,
    });

    const invoice = await closeService.createInvoice({
      leadId: lead.id,
      proposalId: proposal.id,
      totalCents: proposal.totalCents,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await crmDb.reminder.create({
      data: {
        leadId: lead.id,
        channel: phone ? ChannelType.SMS : ChannelType.EMAIL,
        sendAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        payload: {
          message: `Reminder: invoice ${invoice.number} is still open. Reply if you want an adjusted payment plan.`,
          invoiceId: invoice.id,
          type: 'invoice_unpaid_reminder',
        },
      },
    });

    const stageAutomation = await nurtureService.triggerWorkflows({
      triggerType: 'stage_changed',
      leadId: lead.id,
      context: {
        newStage: 'PROPOSAL_SENT',
        firstName: lead.firstName,
      },
    });

    let reviewRequest: unknown = null;
    if (sendReviewRequest) {
      reviewRequest = await retainService.requestReview({
        leadId: lead.id,
        channel: phone ? ChannelType.SMS : ChannelType.EMAIL,
        message: templates.reviewRequest,
      });
    }

    let reengagementCount = 0;
    if (runReengagement) {
      const staleLeads = await crmDb.lead.findMany({
        where: {
          updatedAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        take: 25,
      });

      for (const staleLead of staleLeads) {
        if (!staleLead.phone && !staleLead.email) continue;
        await nurtureService.sendMessage({
          leadId: staleLead.id,
          channel: staleLead.phone ? ChannelType.SMS : ChannelType.EMAIL,
          content: templates.reengagement,
          source: 'reengagement-campaign',
          autoReply: false,
        });
        reengagementCount += 1;
      }
    }

    const elapsedMs = Math.max(1, Date.now() - startedAt);

    return jsonResponse(
      {
        ok: true,
        elapsedMs,
        workflows: {
          seeded: workflowSeed,
          leadCreatedAutomation,
          missedCallAutomation,
          stageAutomation,
        },
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          email: lead.email,
          phone: lead.phone,
        },
        leadHandling: {
          instantReplyMessageId: instantReply.outbound.id,
          aiChatReplyId: aiChatReply.id,
        },
        revenue: {
          estimateId: estimate.estimateId,
          proposalId: proposal.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
        },
        retention: {
          reviewRequest,
          reengagementCount,
        },
        status: {
          level: health.level,
          alerts: health.alerts,
          generatedAt: health.generatedAt,
        },
      },
      201
    );
  });
}
