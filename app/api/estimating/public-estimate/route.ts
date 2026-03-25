import { ChannelType, LeadSourceType } from '@/generated/crm-client';
import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseBoolean, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';
import { NurtureService } from '@/src/crm/modules/nurture';
import {
  createBidEstimate,
  getProjectCategoryOptions,
  type ProjectCategory,
} from '@/src/estimating/ai-takeoff';
import { loadEstimationMarketEnvelope } from '@/src/estimating/market-signals';

export const runtime = 'nodejs';

const captureService = new LeadCaptureService();
const nurtureService = new NurtureService();

type PublicEstimateBody = {
  projectType?: unknown;
  zipCode?: unknown;
  description?: unknown;
  squareFootage?: unknown;
  budget?: unknown;
  timeline?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  unlockFullResult?: unknown;
};

type BallparkRange = {
  low: number;
  average: number;
  high: number;
  spreadPercent: number;
};

function normalizeProjectType(value: unknown): ProjectCategory | undefined {
  const normalized = parseOptionalString(value)?.toLowerCase();
  if (
    normalized === 'deck' ||
    normalized === 'bathroom-remodel' ||
    normalized === 'kitchen-gut' ||
    normalized === 'roof-replacement' ||
    normalized === 'basement-finish' ||
    normalized === 'general-construction'
  ) {
    return normalized;
  }
  return undefined;
}

function parseSquareFootage(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.max(40, Math.min(25000, Math.round(parsed)));
}

function buildDescription(input: {
  projectType?: ProjectCategory;
  description?: string;
  squareFootage?: number;
}): string {
  const typedDescription = input.description?.trim();
  if (typedDescription) {
    if (input.squareFootage) {
      return `${typedDescription} Approx area: ${input.squareFootage} sq ft.`;
    }
    return typedDescription;
  }

  const project = input.projectType || 'general-construction';
  if (input.squareFootage) {
    return `${project} project around ${input.squareFootage} sq ft with standard mid-tier finish requirements.`;
  }

  return `${project} project with standard scope and finish requirements.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildBallparkRange(average: number, confidence: number): BallparkRange {
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

  next.assumptions = [
    ...next.assumptions,
    `Market calibration multiplier applied: ${multiplier.toFixed(3)} based on current regional/CPI signals.`,
  ];

  return next;
}

function buildAiInsights(params: {
  projectType: string;
  range: BallparkRange;
  budget?: string;
  timeline?: string;
}): {
  scopeAdjustments: string[];
  costSavingIdeas: string[];
  qualification: {
    budgetSignal: 'strong' | 'moderate' | 'weak';
    timelineSignal: 'urgent' | 'normal' | 'flexible';
    recommendation: string;
  };
} {
  const budget = (params.budget || '').toLowerCase();
  const timeline = (params.timeline || '').toLowerCase();

  const budgetSignal: 'strong' | 'moderate' | 'weak' =
    /\$?\s*(3\d{4}|[4-9]\d{4}|\d{6,})/.test(budget)
      ? 'strong'
      : /\$?\s*(1\d{4}|2\d{4})/.test(budget)
      ? 'moderate'
      : 'weak';

  const timelineSignal: 'urgent' | 'normal' | 'flexible' =
    /asap|urgent|immediately|this week/.test(timeline)
      ? 'urgent'
      : /30|month|soon|next few weeks/.test(timeline)
      ? 'normal'
      : 'flexible';

  const recommendation =
    budgetSignal === 'weak'
      ? 'Lead may need phased options and financing conversation before final quote.'
      : timelineSignal === 'urgent'
      ? 'Prioritize immediate follow-up and schedule hold with fast-turn proposal.'
      : 'Proceed with standard bid handoff and multi-touch follow-up sequence.';

  return {
    scopeAdjustments: [
      `Offer three scope tiers for ${params.projectType}: essential, recommended, and premium finish.`,
      'Include a contingency allowance for site conditions and permit-related adjustments.',
      'Break out optional add-ons so the buyer can approve core scope faster.',
    ],
    costSavingIdeas: [
      'Use phased scheduling to separate must-do scope from cosmetic upgrades.',
      'Offer equivalent material alternatives with lower lead times and lower waste factors.',
      'Bundle labor tasks by trade day to reduce mobilization overhead.',
    ],
    qualification: {
      budgetSignal,
      timelineSignal,
      recommendation,
    },
  };
}

function getDeliveryChannel(email?: string, phone?: string): ChannelType {
  if (email) return ChannelType.EMAIL;
  if (phone) return ChannelType.SMS;
  return ChannelType.CHAT;
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      notes:
        'POST project details to receive a low/average/high ballpark range. Set unlockFullResult=true with contact info to create CRM lead and unlock full estimate details.',
      projectTypes: getProjectCategoryOptions(),
      routes: {
        public: '/estimate',
        contractor: '/construction-solutions',
      },
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<PublicEstimateBody>(request);

    const projectType = normalizeProjectType(body.projectType) || 'general-construction';
    const description = parseOptionalString(body.description);
    const zipCode = parseOptionalString(body.zipCode);
    const squareFootage = parseSquareFootage(body.squareFootage);
    const budget = parseOptionalString(body.budget);
    const timeline = parseOptionalString(body.timeline);
    const unlockFullResult = parseBoolean(body.unlockFullResult, false);

    const estimateInput = buildDescription({
      projectType,
      description,
      squareFootage,
    });

    const baseEstimate = createBidEstimate({
      description: estimateInput,
      projectCategory: projectType,
      zipCode,
    });

    const marketEnvelope = await loadEstimationMarketEnvelope(zipCode || undefined);
    const estimate = applyEstimateMarketMultiplier(baseEstimate, marketEnvelope.multiplier);

    const range = buildBallparkRange(estimate.totals.grandTotal, estimate.confidence);
    const aiInsights = buildAiInsights({
      projectType,
      range,
      budget,
      timeline,
    });

    if (!unlockFullResult) {
      return jsonResponse({
        mode: 'preview',
        estimateRange: range,
        projectType,
        zipCode: zipCode || null,
        instantSummary: `Estimated cost: $${range.low.toLocaleString('en-US')} - $${range.high.toLocaleString('en-US')}`,
        marketSignals: marketEnvelope,
        cta: {
          label: 'Unlock full estimate',
          requiredFields: ['firstName', 'email or phone'],
        },
        aiInsights,
      });
    }

    const firstName = parseOptionalString(body.firstName);
    const lastName = parseOptionalString(body.lastName);
    const email = parseOptionalString(body.email);
    const phone = parseOptionalString(body.phone);

    if (!firstName) {
      throw new ApiError(400, 'firstName is required to unlock full result.', 'FIRST_NAME_REQUIRED');
    }

    if (!email && !phone) {
      throw new ApiError(400, 'email or phone is required to unlock full result.', 'CONTACT_REQUIRED');
    }

    const lead = await captureService.createLead({
      firstName,
      lastName,
      email,
      phone,
      sourceType: LeadSourceType.FORM,
      sourceName: 'public-cost-calculator',
      campaignName: 'public-estimator-lead-magnet',
      firstMessage: `Requested ${projectType} ballpark estimate in ${zipCode || 'unknown region'}.`,
      firstMessageChannel: ChannelType.CHAT,
      tags: ['public-estimate', projectType, 'homeowner-intent'],
      metadata: {
        module: 'public-estimator',
        zipCode,
        budget,
        timeline,
        squareFootage,
        range,
        estimateId: estimate.estimateId,
      },
    });

    const deliveryChannel = getDeliveryChannel(email, phone);
    const confirmationMessage = [
      `Hi ${firstName}, your ${projectType} estimate range is ready.`,
      `Ballpark range: $${range.low.toLocaleString('en-US')} - $${range.high.toLocaleString('en-US')}`,
      `Average estimate: $${range.average.toLocaleString('en-US')}`,
      'Reply to this message if you want scope adjustment options before requesting an exact quote.',
    ].join('\n');

    let deliverySummary: {
      channel: ChannelType;
      provider: string;
      status: string;
      detail: string;
      outboundMessageId: string | null;
      error?: string;
    } | null = null;

    try {
      const deliveryResult = await nurtureService.sendMessage({
        leadId: lead.id,
        channel: deliveryChannel,
        content: confirmationMessage,
        subject: deliveryChannel === ChannelType.EMAIL ? 'Your Ballpark Estimate From Cortex' : undefined,
        source: 'public-estimator',
        autoReply: false,
        tone: 'friendly',
      });

      deliverySummary = {
        channel: deliveryChannel,
        provider: deliveryResult.delivery.provider,
        status: deliveryResult.delivery.status,
        detail: deliveryResult.delivery.detail,
        outboundMessageId: deliveryResult.outbound.id,
      };
    } catch (error) {
      deliverySummary = {
        channel: deliveryChannel,
        provider: 'delivery-adapter',
        status: 'failed',
        detail: 'Confirmation message could not be delivered.',
        outboundMessageId: null,
        error: error instanceof Error ? error.message : 'Unknown delivery failure',
      };
    }

    return jsonResponse(
      {
        mode: 'full',
        estimateRange: range,
        estimate: {
          estimateId: estimate.estimateId,
          categoryLabel: estimate.categoryLabel,
          totals: estimate.totals,
          timeline: estimate.timeline,
          materials: estimate.materials,
          labor: estimate.labor,
          assumptions: estimate.assumptions,
        },
        aiInsights,
        marketSignals: marketEnvelope,
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          stage: lead.stage,
        },
        delivery: deliverySummary,
        nextActions: [
          'Review material and labor breakdown with your selected contractor.',
          'Request an exact quote with a site visit for scope confirmation.',
          'Schedule follow-up within 24 hours to secure timeline and pricing.',
        ],
      },
      201
    );
  });
}
