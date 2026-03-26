import { ChannelType } from '@/generated/crm-client';
import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { crmDb } from '@/src/crm/core/crmDb';
import { CloseService } from '@/src/crm/modules/close';
import { NurtureService } from '@/src/crm/modules/nurture';

export const runtime = 'nodejs';

const closeService = new CloseService();
const nurtureService = new NurtureService();

type EstimateLine = {
  item?: string;
  quantity?: number;
  unit?: string;
  totalCost?: number;
  trade?: string;
  hours?: number;
};

type EstimateSnapshot = {
  estimateId?: string;
  categoryLabel?: string;
  totals?: {
    grandTotal?: number;
    materials?: number;
    labor?: number;
    overhead?: number;
    profit?: number;
  };
  materials?: EstimateLine[];
  labor?: EstimateLine[];
  assumptions?: string[];
};

type HandoffBody = {
  leadId?: unknown;
  estimate?: unknown;
  successUrl?: unknown;
  cancelUrl?: unknown;
};

function normalizeEstimate(value: unknown): EstimateSnapshot {
  const raw = (value || {}) as EstimateSnapshot;
  return {
    estimateId: parseOptionalString(raw.estimateId),
    categoryLabel: parseOptionalString(raw.categoryLabel) || 'Project',
    totals: {
      grandTotal: Number(raw.totals?.grandTotal) || 0,
      materials: Number(raw.totals?.materials) || 0,
      labor: Number(raw.totals?.labor) || 0,
      overhead: Number(raw.totals?.overhead) || 0,
      profit: Number(raw.totals?.profit) || 0,
    },
    materials: Array.isArray(raw.materials) ? raw.materials : [],
    labor: Array.isArray(raw.labor) ? raw.labor : [],
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.filter((item): item is string => typeof item === 'string') : [],
  };
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<HandoffBody>(request);
    const leadId = parseOptionalString(body.leadId);
    if (!leadId) {
      throw new ApiError(400, 'leadId is required', 'LEAD_ID_REQUIRED');
    }

    const lead = await crmDb.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const estimate = normalizeEstimate(body.estimate);
    if (!estimate.totals?.grandTotal || estimate.totals.grandTotal <= 0) {
      throw new ApiError(400, 'A valid estimate snapshot is required.', 'ESTIMATE_REQUIRED');
    }

    const materialItems = (estimate.materials || [])
      .slice(0, 8)
      .map((line) => {
        const quantity = Math.max(1, Math.round(Number(line.quantity) || 1));
        const totalCost = Math.max(0, Number(line.totalCost) || 0);
        const unitPriceCents = Math.max(100, Math.round((totalCost / quantity) * 100));
        return {
          label: `${line.item || 'Material'} (${line.unit || 'unit'})`,
          quantity,
          unitPriceCents,
        };
      });

    const laborItems = (estimate.labor || [])
      .slice(0, 6)
      .map((line) => {
        const quantity = Math.max(1, Math.round(Number(line.hours) || 1));
        const totalCost = Math.max(0, Number(line.totalCost) || 0);
        const unitPriceCents = Math.max(100, Math.round((totalCost / quantity) * 100));
        return {
          label: `${line.trade || 'Labor'} labor`,
          quantity,
          unitPriceCents,
        };
      });

    const proposal = await closeService.createProposal({
      leadId,
      title: `${estimate.categoryLabel || 'Project'} Proposal`,
      lineItems: [...materialItems, ...laborItems],
      notes: estimate.assumptions?.slice(0, 8).join('\n') || 'Prepared from estimator chat session.',
    });

    const totalCents = Math.max(5000, Math.round((estimate.totals.grandTotal || 0) * 100));
    const productId = `estimator-checkout-${leadId}`;

    const product = await crmDb.product.upsert({
      where: { id: productId },
      update: {
        name: `${estimate.categoryLabel || 'Project'} - Approved Estimate Checkout`,
        priceCents: totalCents,
        currency: 'USD',
        active: true,
        metadata: {
          source: 'estimator-chat-handoff',
          estimateId: estimate.estimateId || null,
          leadId,
        },
      },
      create: {
        id: productId,
        name: `${estimate.categoryLabel || 'Project'} - Approved Estimate Checkout`,
        description: 'One-click checkout generated from estimator chat handoff.',
        priceCents: totalCents,
        currency: 'USD',
        active: true,
        metadata: {
          source: 'estimator-chat-handoff',
          estimateId: estimate.estimateId || null,
          leadId,
        },
      },
    });

    const requestUrl = new URL(request.url);
    const origin = `${requestUrl.protocol}//${requestUrl.host}`;
    const successUrl = parseOptionalString(body.successUrl) || `${origin}/estimate?handoff=success&leadId=${encodeURIComponent(leadId)}`;
    const cancelUrl = parseOptionalString(body.cancelUrl) || `${origin}/estimate?handoff=cancel&leadId=${encodeURIComponent(leadId)}`;

    const checkout = await closeService.createCheckout({
      leadId,
      items: [
        {
          productId: product.id,
          quantity: 1,
        },
      ],
      successUrl,
      cancelUrl,
    });

    const workflowResult = await nurtureService.triggerWorkflows({
      triggerType: 'proposal_sent',
      leadId,
      context: {
        proposalId: proposal.id,
        estimateId: estimate.estimateId || null,
        checkoutUrl: checkout.checkoutUrl,
        totalUsd: estimate.totals.grandTotal,
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId,
        type: 'estimator_handoff_completed',
        channel: ChannelType.CHAT,
        payload: {
          proposalId: proposal.id,
          checkoutUrl: checkout.checkoutUrl,
          totalCents,
          estimateId: estimate.estimateId || null,
        },
      },
    });

    return jsonResponse({
      proposal,
      checkout,
      workflowResult,
      handoffSummary: {
        leadId,
        proposalId: proposal.id,
        checkoutUrl: checkout.checkoutUrl,
      },
    });
  });
}
