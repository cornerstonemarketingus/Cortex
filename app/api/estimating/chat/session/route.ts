import { ChannelType, ConversationDirection, type LeadSourceType } from '@/generated/crm-client';
import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { crmDb } from '@/src/crm/core/crmDb';
import { LeadCaptureService } from '@/src/crm/modules/capture';
import { createBidEstimate, createTakeoffEstimate, type ProjectCategory, type UploadedPlanFile } from '@/src/estimating/ai-takeoff';
import { loadEstimationMarketEnvelope } from '@/src/estimating/market-signals';
import { generateSandboxPreview } from '@/src/builder/sandbox-preview';

export const runtime = 'nodejs';

const captureService = new LeadCaptureService();

type FileMetadata = {
  name?: unknown;
  type?: unknown;
  size?: unknown;
};

type SessionBody = {
  leadId?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  projectType?: unknown;
  zipCode?: unknown;
  description?: unknown;
  squareFootage?: unknown;
  budget?: unknown;
  timeline?: unknown;
  userMessage?: unknown;
  files?: unknown;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseSquareFootage(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.max(40, Math.min(25000, Math.round(parsed)));
}

function normalizeProjectType(value: unknown): ProjectCategory {
  const raw = parseOptionalString(value)?.toLowerCase();
  if (
    raw === 'deck' ||
    raw === 'bathroom-remodel' ||
    raw === 'kitchen-gut' ||
    raw === 'roof-replacement' ||
    raw === 'basement-finish' ||
    raw === 'general-construction'
  ) {
    return raw;
  }
  return 'general-construction';
}

function buildDescription(params: {
  projectType: ProjectCategory;
  description?: string;
  squareFootage?: number;
}): string {
  const typed = params.description?.trim();
  if (typed) {
    if (params.squareFootage) {
      return `${typed} Approx area: ${params.squareFootage} sq ft.`;
    }
    return typed;
  }

  if (params.squareFootage) {
    return `${params.projectType} project around ${params.squareFootage} sq ft with standard mid-tier finish requirements.`;
  }

  return `${params.projectType} project with standard scope and finish requirements.`;
}

function buildBallparkRange(average: number, confidence: number) {
  const spreadPercent = clamp(0.1 + (1 - confidence) * 0.22, 0.1, 0.3);
  const low = Math.max(0, Math.round(average * (1 - spreadPercent)));
  const high = Math.max(low, Math.round(average * (1 + spreadPercent)));

  return {
    low,
    average: Math.round(average),
    high,
    spreadPercent: Number((spreadPercent * 100).toFixed(1)),
  };
}

function applyEstimateMarketMultiplier(
  estimate: ReturnType<typeof createBidEstimate>,
  multiplier: number
): ReturnType<typeof createBidEstimate> {
  const next = structuredClone(estimate);

  next.materials = next.materials.map((line) => {
    const unitCost = Number((line.unitCost * multiplier).toFixed(2));
    return {
      ...line,
      unitCost,
      totalCost: Number((line.quantity * unitCost).toFixed(2)),
    };
  });

  next.labor = next.labor.map((line) => {
    const hourlyRate = Number((line.hourlyRate * multiplier).toFixed(2));
    return {
      ...line,
      hourlyRate,
      totalCost: Number((line.hours * hourlyRate).toFixed(2)),
    };
  });

  const materials = Number(next.materials.reduce((sum, line) => sum + line.totalCost, 0).toFixed(2));
  const labor = Number(next.labor.reduce((sum, line) => sum + line.totalCost, 0).toFixed(2));
  const subtotal = materials + labor;
  const overhead = Number((subtotal * (next.margin.overheadPercent / 100)).toFixed(2));
  const profit = Number(((subtotal + overhead) * (next.margin.profitPercent / 100)).toFixed(2));
  const grandTotal = Number((subtotal + overhead + profit).toFixed(2));

  next.totals = {
    materials,
    labor,
    overhead,
    profit,
    grandTotal,
  };

  return next;
}

function normalizeFileMetadata(value: unknown): UploadedPlanFile[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const candidate = (item || {}) as FileMetadata;
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      if (!name) return null;
      const type = typeof candidate.type === 'string' && candidate.type.trim() ? candidate.type.trim() : 'application/octet-stream';
      const size = Number(candidate.size);

      return {
        name,
        type,
        size: Number.isFinite(size) ? Math.max(0, Math.floor(size)) : 0,
      } satisfies UploadedPlanFile;
    })
    .filter((item): item is UploadedPlanFile => item !== null)
    .slice(0, 20);
}

function deriveSectionsFromCommand(command: string): string[] {
  const normalized = command.toLowerCase();
  const sections = ['Hero', 'Scope', 'Estimate Breakdown', 'Testimonials', 'Map', 'CTA'];

  if (/move\s+cta\s+above\s+fold|cta\s+above\s+fold/.test(normalized)) {
    return ['Hero', 'CTA', 'Scope', 'Estimate Breakdown', 'Testimonials', 'Map'];
  }

  if (/add\s+testimonials/.test(normalized) && !sections.includes('Testimonials')) {
    sections.push('Testimonials');
  }

  if (/map|service\s+area/.test(normalized) && !sections.includes('Map')) {
    sections.push('Map');
  }

  return sections;
}

async function resolveLead(body: SessionBody) {
  const leadId = parseOptionalString(body.leadId);
  if (leadId) {
    const existing = await crmDb.lead.findUnique({ where: { id: leadId } });
    if (existing) return existing;
  }

  const firstName = parseOptionalString(body.firstName);
  const email = parseOptionalString(body.email);
  const phone = parseOptionalString(body.phone);

  if (!firstName || (!email && !phone)) {
    return null;
  }

  const projectType = normalizeProjectType(body.projectType);
  const zipCode = parseOptionalString(body.zipCode);

  return captureService.createLead({
    firstName,
    lastName: parseOptionalString(body.lastName),
    email,
    phone,
    sourceType: 'CHAT_WIDGET' as LeadSourceType,
    sourceName: 'estimator-chat',
    campaignName: 'estimator-chatbot',
    firstMessage: `Started estimator chat for ${projectType} in ${zipCode || 'unknown ZIP'}.`,
    firstMessageChannel: ChannelType.CHAT,
    tags: ['estimator-chat', projectType],
    metadata: {
      module: 'estimator-chat',
      zipCode,
    },
  });
}

async function findOrCreateConversation(leadId: string) {
  const existing = await crmDb.conversation.findFirst({
    where: {
      leadId,
      source: 'estimator-chat',
      channel: ChannelType.CHAT,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) return existing;

  return crmDb.conversation.create({
    data: {
      leadId,
      channel: ChannelType.CHAT,
      source: 'estimator-chat',
      metadata: {
        module: 'estimator-chat',
      },
    },
  });
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const url = new URL(request.url);
    const leadId = parseOptionalString(url.searchParams.get('leadId'));
    if (!leadId) {
      throw new ApiError(400, 'leadId is required', 'LEAD_ID_REQUIRED');
    }

    const lead = await crmDb.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const conversation = await crmDb.conversation.findFirst({
      where: { leadId, source: 'estimator-chat' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const timeline = await crmDb.interaction.findMany({
      where: {
        leadId,
        type: {
          in: ['estimator_chat_turn', 'estimate_version_created', 'estimator_scope_extracted', 'estimator_handoff_completed'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return jsonResponse({
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        stage: lead.stage,
      },
      conversation: conversation
        ? {
            id: conversation.id,
            messages: conversation.messages,
          }
        : null,
      timeline,
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<SessionBody>(request);

    const projectType = normalizeProjectType(body.projectType);
    const zipCode = parseOptionalString(body.zipCode) || '55123';
    const squareFootage = parseSquareFootage(body.squareFootage);
    const description = buildDescription({
      projectType,
      description: parseOptionalString(body.description),
      squareFootage,
    });
    const budget = parseOptionalString(body.budget);
    const timeline = parseOptionalString(body.timeline);
    const userMessage = parseOptionalString(body.userMessage) || 'Generate estimate and preview.';
    const files = normalizeFileMetadata(body.files);

    const baseEstimate = createBidEstimate({
      description,
      projectCategory: projectType,
      zipCode,
    });

    const marketEnvelope = await loadEstimationMarketEnvelope(zipCode);
    const estimate = applyEstimateMarketMultiplier(baseEstimate, marketEnvelope.multiplier);
    const range = buildBallparkRange(estimate.totals.grandTotal, estimate.confidence);

    const confidenceScore = Math.round(
      clamp((estimate.confidence * 0.65 + marketEnvelope.confidence * 0.35) * 100, 40, 97)
    );

    const previewSections = deriveSectionsFromCommand(userMessage);
    const preview = generateSandboxPreview({
      blueprint: 'website',
      projectName: `${projectType} project`,
      prompt: `${description} User request: ${userMessage}`,
      sections: previewSections,
      modules: ['Estimator Intake', 'Lead Routing', 'Proposal Automation', 'Payment Link Handoff'],
    });

    const takeoffEstimate = createTakeoffEstimate({
      files,
      description,
      projectCategory: projectType,
      zipCode,
    });

    const scopeAssumptions = [
      ...takeoffEstimate.materials.slice(0, 6).map((line) => `${line.item}: ${line.quantity} ${line.unit}`),
      ...takeoffEstimate.labor.slice(0, 4).map((line) => `${line.trade}: ${Math.round(line.hours)} hours`),
    ];

    const lead = await resolveLead(body);
    let conversationId: string | null = null;

    if (lead) {
      const conversation = await findOrCreateConversation(lead.id);
      conversationId = conversation.id;

      await crmDb.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction: ConversationDirection.INBOUND,
          channel: ChannelType.CHAT,
          content: userMessage,
          metadata: {
            projectType,
            zipCode,
            description,
            budget,
            timeline,
            files,
          },
        },
      });

      const assistantSummary = [
        `Range: $${range.low.toLocaleString('en-US')} - $${range.high.toLocaleString('en-US')} (avg $${range.average.toLocaleString('en-US')})`,
        `Confidence: ${confidenceScore}%`,
        `Preview updated with command: ${userMessage}`,
      ].join(' | ');

      await crmDb.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction: ConversationDirection.OUTBOUND,
          channel: ChannelType.CHAT,
          aiGenerated: true,
          content: assistantSummary,
          metadata: {
            estimateId: estimate.estimateId,
            marketMultiplier: marketEnvelope.multiplier,
            confidenceScore,
            previewSections,
          },
        },
      });

      await crmDb.interaction.create({
        data: {
          leadId: lead.id,
          type: 'estimator_chat_turn',
          channel: ChannelType.CHAT,
          payload: {
            userMessage,
            projectType,
            zipCode,
            description,
            estimateRange: range,
            confidenceScore,
          },
        },
      });

      await crmDb.interaction.create({
        data: {
          leadId: lead.id,
          type: 'estimate_version_created',
          channel: ChannelType.CHAT,
          payload: {
            estimateId: estimate.estimateId,
            totals: estimate.totals,
            timeline: estimate.timeline,
            assumptions: estimate.assumptions,
            marketSignals: marketEnvelope.signals,
          },
        },
      });

      await crmDb.interaction.create({
        data: {
          leadId: lead.id,
          type: 'estimator_scope_extracted',
          channel: ChannelType.CHAT,
          payload: {
            fileCount: files.length,
            scopeAssumptions,
            takeoffEstimateId: takeoffEstimate.estimateId,
          },
        },
      });
    }

    return jsonResponse({
      lead: lead
        ? {
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            stage: lead.stage,
          }
        : null,
      conversationId,
      estimate: {
        estimateId: estimate.estimateId,
        categoryLabel: estimate.categoryLabel,
        totals: estimate.totals,
        timeline: estimate.timeline,
        materials: estimate.materials,
        labor: estimate.labor,
        assumptions: estimate.assumptions,
      },
      estimateRange: range,
      confidenceScore,
      marketSignals: marketEnvelope,
      scopeExtraction: {
        estimateId: takeoffEstimate.estimateId,
        assumptions: scopeAssumptions,
        materialLines: takeoffEstimate.materials.slice(0, 8),
        laborLines: takeoffEstimate.labor.slice(0, 8),
      },
      preview,
    });
  });
}
