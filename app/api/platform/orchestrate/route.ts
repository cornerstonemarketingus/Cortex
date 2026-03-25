import { ChannelType, LeadSourceType } from '@/generated/crm-client';
import { ApiError, readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';
import { NurtureService } from '@/src/crm/modules/nurture';
import { buildPrompt } from '@/src/platform/prompt-engineering';
import { callOpenAiChat } from '@/src/crm/core/openai';
import { consumePromptCredits } from '@/src/billing/subscription.service';
import { buildApprovalPayload } from '@/src/platform/approval-lifecycle';
import { recordBelongsToTenant, requireTenantContext } from '@/src/platform/tenant-enforcement';
import { toPrismaJson } from '@/src/crm/core/json';

type OrchestrateBody = {
  objective?: unknown;
  firstName?: unknown;
  email?: unknown;
  phone?: unknown;
  sourceName?: unknown;
  tenantId?: unknown;
  subscriberEmail?: unknown;
};

const captureService = new LeadCaptureService();
const nurtureService = new NurtureService();

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const tenant = requireTenantContext(request, { claims: auth, required: true });
    const url = new URL(request.url);
    const leadId = parseOptionalString(url.searchParams.get('leadId'));
    if (!leadId) {
      throw new ApiError(400, 'leadId query param is required', 'LEAD_ID_REQUIRED');
    }

    const lead = await crmDb.lead.findUnique({
      where: { id: leadId },
      select: { id: true, metadata: true },
    });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }
    if (!recordBelongsToTenant(lead.metadata, tenant.tenantId)) {
      throw new ApiError(403, 'Lead is outside tenant scope', 'TENANT_LEAD_FORBIDDEN');
    }

    const [states, approvals] = await Promise.all([
      crmDb.interaction.findMany({
        where: {
          leadId,
          type: 'orchestration_state',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      }),
      crmDb.interaction.findMany({
        where: {
          leadId,
          type: 'approval_request',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      }),
    ]);

    const scopedStates = states.filter((item) => recordBelongsToTenant(item.payload, tenant.tenantId));
    const scopedApprovals = approvals.filter((item) => recordBelongsToTenant(item.payload, tenant.tenantId));

    return jsonResponse({
      leadId,
      tenantId: tenant.tenantId,
      states: scopedStates,
      approvals: scopedApprovals,
      currentState: scopedStates[0] || null,
      currentApproval: scopedApprovals[0] || null,
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);

    const body = await readJson<OrchestrateBody>(request);
    const tenant = requireTenantContext(request, {
      claims: auth,
      bodyTenantId: body.tenantId,
      required: true,
    });

    const objective = parseOptionalString(body.objective);
    const firstName = parseOptionalString(body.firstName) || 'Workflow Lead';
    const email = parseOptionalString(body.email);
    const phone = parseOptionalString(body.phone);
    const subscriberEmail = parseOptionalString(body.subscriberEmail) || email;

    if (!objective) {
      throw new ApiError(400, 'objective is required', 'OBJECTIVE_REQUIRED');
    }

    if (!email && !phone) {
      throw new ApiError(400, 'email or phone is required', 'CONTACT_REQUIRED');
    }

    if (!subscriberEmail) {
      throw new ApiError(400, 'subscriberEmail is required for AI orchestration credit metering', 'SUBSCRIBER_EMAIL_REQUIRED');
    }

    const lead = await captureService.createLead({
      firstName,
      email,
      phone,
      sourceType: LeadSourceType.MANUAL,
      sourceName: parseOptionalString(body.sourceName) || 'orchestration-api',
      firstMessage: objective,
      firstMessageChannel: phone ? ChannelType.SMS : ChannelType.EMAIL,
      tags: ['orchestrated'],
      metadata: {
        tenantId: tenant.tenantId,
      },
    });

    const prompt = buildPrompt({
      mode: phone ? 'sms-reply' : 'chat-reply',
      objective: `Write first response for lead objective: ${objective}`,
      audience: 'construction lead',
      constraints: ['Use under 240 characters for SMS-like first touch.', 'Provide one next-step CTA.'],
      facts: {
        leadFirstName: lead.firstName,
        hasPhone: Boolean(lead.phone),
        hasEmail: Boolean(lead.email),
      },
    });

    const aiResponse = await callOpenAiChat(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.content },
      ],
      'sales'
    );

    const promptUsage = await consumePromptCredits({
      email: subscriberEmail,
      units: Math.max(1, Math.ceil((prompt.system.length + prompt.content.length + aiResponse.length) / 900)),
      context: {
        operation: 'platform-orchestrate',
        tenantId: tenant.tenantId,
        mode: phone ? 'sms-reply' : 'chat-reply',
        leadId: lead.id,
      },
    });

    const sent = await nurtureService.sendMessage({
      leadId: lead.id,
      channel: phone ? ChannelType.SMS : ChannelType.EMAIL,
      content: aiResponse,
      source: 'orchestration-engine',
      autoReply: false,
    });

    const approvalPayload = buildApprovalPayload({
      tenantId: tenant.tenantId,
      title: 'Approve orchestration handoff sequence',
      requestedBy: auth.sub,
      requestedRole: auth.role,
      reviewerRoles: ['agent', 'admin'],
      data: {
        leadId: lead.id,
        objective,
        messageId: sent.outbound.id,
      },
      metadata: {
        source: 'orchestration-engine',
      },
    });

    const approval = await crmDb.interaction.create({
      data: {
        leadId: lead.id,
        type: 'approval_request',
        payload: toPrismaJson(approvalPayload),
      },
    });

    const state = await crmDb.interaction.create({
      data: {
        leadId: lead.id,
        type: 'orchestration_state',
        payload: toPrismaJson({
          state: 'initiated',
          tenantId: tenant.tenantId,
          objective,
          leadId: lead.id,
          messageId: sent.outbound.id,
          approvalId: approval.id,
          usage: promptUsage,
          updatedAt: new Date().toISOString(),
        }),
      },
    });

    return jsonResponse({
      ok: true,
      tenantId: tenant.tenantId,
      lead,
      ai: {
        prompt,
        response: aiResponse,
        usage: promptUsage,
      },
      state,
      approval,
    }, 201);
  });
}
