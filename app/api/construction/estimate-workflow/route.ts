import { ChannelType, LeadSourceType, PipelineStageType } from '@/generated/crm-client';
import { ApiError } from '@/src/crm/core/api';
import { callOpenAiChat } from '@/src/crm/core/openai';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';
import { CloseService, type ProposalLineItem } from '@/src/crm/modules/close';
import { NurtureService } from '@/src/crm/modules/nurture';
import {
  createBidEstimate,
  createTakeoffEstimate,
  type EstimateResult,
  type UploadedPlanFile,
} from '@/src/estimating/ai-takeoff';

export const runtime = 'nodejs';

type JsonBody = {
  files?: Array<{ name?: unknown; type?: unknown; size?: unknown }>;
  description?: unknown;
  projectCategory?: unknown;
  zipCode?: unknown;
  followUpChannel?: unknown;
  client?: {
    name?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    phone?: unknown;
    company?: unknown;
  };
  clientName?: unknown;
  clientFirstName?: unknown;
  clientLastName?: unknown;
  clientEmail?: unknown;
  clientPhone?: unknown;
  clientCompany?: unknown;
};

type WorkflowInput = {
  files: UploadedPlanFile[];
  description?: string;
  projectCategory?: string;
  zipCode?: string;
  followUpChannel?: string;
  client: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
};

const captureService = new LeadCaptureService();
const closeService = new CloseService();
const nurtureService = new NurtureService();

function normalizeFileMetadata(value: unknown): UploadedPlanFile[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as { name?: unknown; type?: unknown; size?: unknown };
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
      const size = Number(candidate.size);
      if (!name) return null;

      return {
        name,
        type: type || 'application/octet-stream',
        size: Number.isFinite(size) ? Math.max(0, Math.floor(size)) : 0,
      } satisfies UploadedPlanFile;
    })
    .filter((item): item is UploadedPlanFile => item !== null)
    .slice(0, 20);
}

function splitName(name?: string): { firstName?: string; lastName?: string } {
  const cleaned = (name || '').trim();
  if (!cleaned) return {};

  const parts = cleaned.split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || undefined,
  };
}

function parseString(value: FormDataEntryValue | unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePreferredChannel(
  preferredRaw: string | undefined,
  email?: string,
  phone?: string
): ChannelType {
  const preferred = preferredRaw?.trim().toLowerCase();

  if (preferred === 'email' && email) return ChannelType.EMAIL;
  if (preferred === 'sms' && phone) return ChannelType.SMS;
  if (preferred === 'chat') return ChannelType.CHAT;

  if (email) return ChannelType.EMAIL;
  if (phone) return ChannelType.SMS;
  return ChannelType.CHAT;
}

function parseMoneyToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.max(0, Math.round(amount * 100));
}

function buildProposalLineItems(estimate: EstimateResult): ProposalLineItem[] {
  const materialLines = estimate.materials.map((line) => ({
    label: `${line.item} (${line.unit})`,
    quantity: Math.max(1, Math.round(line.quantity * 100) / 100),
    unitPriceCents: Math.max(1, parseMoneyToCents(line.unitCost)),
  }));

  const laborLines = estimate.labor.map((line) => ({
    label: `${line.trade} labor`,
    quantity: Math.max(1, Math.round(line.hours * 100) / 100),
    unitPriceCents: Math.max(1, parseMoneyToCents(line.hourlyRate)),
  }));

  const summaryLines: ProposalLineItem[] = [
    {
      label: 'Project overhead',
      quantity: 1,
      unitPriceCents: Math.max(1, parseMoneyToCents(estimate.totals.overhead)),
    },
    {
      label: 'Target profit margin',
      quantity: 1,
      unitPriceCents: Math.max(1, parseMoneyToCents(estimate.totals.profit)),
    },
  ];

  const lineItems = [...materialLines, ...laborLines, ...summaryLines].slice(0, 50);

  if (lineItems.length > 0) {
    return lineItems;
  }

  return [
    {
      label: `${estimate.categoryLabel} ballpark estimate`,
      quantity: 1,
      unitPriceCents: Math.max(1, parseMoneyToCents(estimate.totals.grandTotal)),
    },
  ];
}

async function buildFollowUpDrafts(params: {
  clientName: string;
  categoryLabel: string;
  totalUsd: number;
  timelineDays: number;
}): Promise<string[]> {
  const fallback = [
    `Hi ${params.clientName}, checking in on your ${params.categoryLabel} estimate. I can walk through scope and options whenever you're ready.`,
    `Wanted to follow up on your ${params.categoryLabel} bid at about $${Math.round(params.totalUsd).toLocaleString('en-US')}. Would you like to review materials or timeline adjustments?`,
    `Final follow-up: we can lock your schedule window (about ${params.timelineDays} days on-site) and confirm next steps today if you'd like to proceed.`,
  ];

  try {
    const aiText = await callOpenAiChat(
      [
        {
          role: 'user',
          content: [
            'Create three short post-bid follow-up messages for a construction client.',
            'Return plain text with one message per line and no numbering.',
            `Client: ${params.clientName}`,
            `Project type: ${params.categoryLabel}`,
            `Ballpark total: $${Math.round(params.totalUsd).toLocaleString('en-US')}`,
            `Estimated duration: ${params.timelineDays} days`,
          ].join('\n'),
        },
      ],
      'sales'
    );

    const parsed = aiText
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter((line) => line.length >= 18)
      .slice(0, 3);

    if (parsed.length === 3) {
      return parsed;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

async function parseInput(request: Request): Promise<WorkflowInput> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();

    const files = formData
      .getAll('files')
      .filter((entry): entry is File => entry instanceof File)
      .map((file) => ({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      }))
      .slice(0, 20);

    const name = parseString(formData.get('clientName'));
    const fromName = splitName(name);

    return {
      files,
      description: parseString(formData.get('description')),
      projectCategory: parseString(formData.get('projectCategory')),
      zipCode: parseString(formData.get('zipCode')),
      followUpChannel: parseString(formData.get('followUpChannel')),
      client: {
        name,
        firstName: parseString(formData.get('clientFirstName')) || fromName.firstName,
        lastName: parseString(formData.get('clientLastName')) || fromName.lastName,
        email: parseString(formData.get('clientEmail')),
        phone: parseString(formData.get('clientPhone')),
        company: parseString(formData.get('clientCompany')),
      },
    };
  }

  const body = (await request.json().catch(() => null)) as JsonBody | null;
  if (!body) {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }

  const nestedName = parseOptionalString(body.client?.name);
  const rootName = parseOptionalString(body.clientName);
  const resolvedName = nestedName || rootName;
  const split = splitName(resolvedName);

  return {
    files: normalizeFileMetadata(body.files),
    description: parseOptionalString(body.description),
    projectCategory: parseOptionalString(body.projectCategory),
    zipCode: parseOptionalString(body.zipCode),
    followUpChannel: parseOptionalString(body.followUpChannel),
    client: {
      name: resolvedName,
      firstName:
        parseOptionalString(body.client?.firstName) ||
        parseOptionalString(body.clientFirstName) ||
        split.firstName,
      lastName:
        parseOptionalString(body.client?.lastName) ||
        parseOptionalString(body.clientLastName) ||
        split.lastName,
      email: parseOptionalString(body.client?.email) || parseOptionalString(body.clientEmail),
      phone: parseOptionalString(body.client?.phone) || parseOptionalString(body.clientPhone),
      company: parseOptionalString(body.client?.company) || parseOptionalString(body.clientCompany),
    },
  };
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      notes:
        'POST project info (description or files) plus client contact details to run estimate, create CRM lead/proposal, and activate post-bid follow-up.',
      required: ['clientFirstName or clientName', 'clientEmail or clientPhone', 'description or files[]'],
      supportedChannels: ['email', 'sms', 'chat'],
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const input = await parseInput(request);

    if (input.files.length === 0 && !input.description) {
      throw new ApiError(
        400,
        'Upload plans or provide project description to estimate.',
        'ESTIMATE_INPUT_REQUIRED'
      );
    }

    if (!input.client.firstName) {
      throw new ApiError(
        400,
        'clientFirstName (or clientName) is required.',
        'CLIENT_FIRST_NAME_REQUIRED'
      );
    }

    if (!input.client.email && !input.client.phone) {
      throw new ApiError(
        400,
        'Provide clientEmail or clientPhone for post-bid follow-up.',
        'CLIENT_CONTACT_REQUIRED'
      );
    }

    const takeoffEstimate = createTakeoffEstimate({
      files: input.files,
      description: input.description,
      projectCategory: input.projectCategory,
      zipCode: input.zipCode,
    });

    const bidEstimate = createBidEstimate({
      description:
        input.description ||
        `Plan-driven ${takeoffEstimate.categoryLabel} scope based on ${input.files.length} uploaded file(s).`,
      projectCategory: input.projectCategory || takeoffEstimate.detectedCategory,
      zipCode: input.zipCode,
    });

    const lead = await captureService.createLead({
      firstName: input.client.firstName,
      lastName: input.client.lastName,
      email: input.client.email,
      phone: input.client.phone,
      company: input.client.company,
      sourceType: LeadSourceType.FORM,
      sourceName: 'construction-estimator',
      campaignName: 'construction-bid-automation',
      firstMessage:
        input.description ||
        `Uploaded ${input.files.length} plan file(s) for ${bidEstimate.categoryLabel} ballpark estimate.`,
      firstMessageChannel: ChannelType.CHAT,
      metadata: {
        module: 'construction-estimator',
        estimateId: bidEstimate.estimateId,
        projectCategory: bidEstimate.detectedCategory,
        zipCode: input.zipCode,
        ballparkTotalUsd: bidEstimate.totals.grandTotal,
        uploadedFiles: input.files,
      },
      tags: ['construction', 'estimate', bidEstimate.detectedCategory],
    });

    const proposal = await closeService.createProposal({
      leadId: lead.id,
      title: `${bidEstimate.categoryLabel} Ballpark Estimate`,
      lineItems: buildProposalLineItems(bidEstimate),
      notes: [
        `Estimate ID: ${bidEstimate.estimateId}`,
        `Timeline: ${bidEstimate.timeline.estimatedDays} days`,
        `Assumptions: ${bidEstimate.assumptions.join(' | ')}`,
      ].join('\n'),
    });

    const preferredChannel = parsePreferredChannel(
      input.followUpChannel,
      input.client.email,
      input.client.phone
    );

    const clientName = `${input.client.firstName}${input.client.lastName ? ` ${input.client.lastName}` : ''}`;
    const followUpDrafts = await buildFollowUpDrafts({
      clientName,
      categoryLabel: bidEstimate.categoryLabel,
      totalUsd: bidEstimate.totals.grandTotal,
      timelineDays: bidEstimate.timeline.estimatedDays,
    });

    const openingMessage = [
      `Hi ${clientName}, your ${bidEstimate.categoryLabel} ballpark estimate is ready.`,
      `Estimated total: $${Math.round(bidEstimate.totals.grandTotal).toLocaleString('en-US')}`,
      `Estimated timeline: ${bidEstimate.timeline.estimatedDays} days with a ${bidEstimate.timeline.crewSize}-person crew.`,
      `Proposal ID: ${proposal.id}`,
      '',
      'Reply with questions and we can fine-tune scope before final contract.',
    ].join('\n');

    const outbound = await nurtureService.sendMessage({
      leadId: lead.id,
      channel: preferredChannel,
      content: openingMessage,
      subject: preferredChannel === ChannelType.EMAIL ? `${bidEstimate.categoryLabel} Ballpark Estimate` : undefined,
      source: 'construction-estimator',
      tone: 'sales',
      autoReply: true,
    });

    const reminderOffsetsHours = [6, 24, 72];
    const reminders = await Promise.all(
      followUpDrafts.map((message, index) => {
        const offsetHours = reminderOffsetsHours[index] || 24;
        return crmDb.reminder.create({
          data: {
            leadId: lead.id,
            channel: preferredChannel,
            sendAt: new Date(Date.now() + offsetHours * 60 * 60 * 1000),
            payload: {
              source: 'construction-bid-follow-up',
              message,
              proposalId: proposal.id,
              estimateId: bidEstimate.estimateId,
              offsetHours,
            },
          },
        });
      })
    );

    await crmDb.lead.update({
      where: {
        id: lead.id,
      },
      data: {
        stage: PipelineStageType.PROPOSAL_SENT,
      },
    });

    return jsonResponse(
      {
        workflowId: `cwf_${Date.now().toString(36)}`,
        estimate: {
          takeoff: takeoffEstimate,
          bid: bidEstimate,
        },
        crm: {
          lead: {
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            stage: PipelineStageType.PROPOSAL_SENT,
          },
          proposal: {
            id: proposal.id,
            title: proposal.title,
            totalCents: proposal.totalCents,
            totalUsd: proposal.totalCents / 100,
          },
          delivery: {
            channel: preferredChannel,
            outboundMessageId: outbound.outbound.id,
            provider: outbound.delivery.provider,
            status: outbound.delivery.status,
            detail: outbound.delivery.detail,
          },
          aiFollowUp: {
            drafts: followUpDrafts,
            reminders: reminders.map((reminder, index) => ({
              reminderId: reminder.id,
              channel: reminder.channel,
              sendAt: reminder.sendAt,
              offsetHours: reminderOffsetsHours[index] || 24,
            })),
          },
        },
      },
      201
    );
  });
}
