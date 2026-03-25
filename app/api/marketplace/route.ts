import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import {
  MARKETPLACE_PHASE_ROADMAP,
  getMarketplaceIntegrations,
  routeMarketplaceLeadWithMaps,
  type AssignmentMode,
  type MarketplaceLeadInput,
} from '@/src/marketplace/revenue-marketplace';

export const runtime = 'nodejs';

type MarketplaceBody = {
  action?: unknown;
  lead?: unknown;
  assignmentMode?: unknown;
  claimWindowMinutes?: unknown;
};

function parseNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function parseAssignmentMode(value: unknown): AssignmentMode {
  return value === 'auto-assign' ? 'auto-assign' : 'claim';
}

function parseLead(value: unknown): MarketplaceLeadInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'lead object is required.', 'LEAD_REQUIRED');
  }

  const record = value as Record<string, unknown>;

  const serviceType = parseOptionalString(record.serviceType) || 'general-construction';
  const projectType = parseOptionalString(record.projectType) || serviceType;
  const zipCode = parseOptionalString(record.zipCode) || '55123';
  const homeownerName = parseOptionalString(record.homeownerName);
  const notes = parseOptionalString(record.notes);
  const budgetUsd = parseNumber(record.budgetUsd, 8500, 300, 500000);
  const timelineDays = parseNumber(record.timelineDays, 14, 1, 365);

  return {
    serviceType,
    projectType,
    zipCode,
    homeownerName,
    notes,
    budgetUsd,
    timelineDays,
  };
}

async function parseBody(request: Request): Promise<MarketplaceBody> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new ApiError(400, 'Request body is required.', 'MISSING_BODY');
  }

  try {
    return JSON.parse(raw) as MarketplaceBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }
}

export async function GET() {
  return withApiHandler(async () => {
    const integrations = getMarketplaceIntegrations();

    return jsonResponse({
      integrations,
      phaseRoadmap: MARKETPLACE_PHASE_ROADMAP,
      notes:
        'POST action=score-route with lead payload to run ROI-focused lead scoring, smart routing, and claim/auto-assign simulation.',
      sampleRequest: {
        action: 'score-route',
        assignmentMode: 'claim',
        lead: {
          serviceType: 'roofing',
          projectType: 'roof-replacement',
          budgetUsd: 18000,
          timelineDays: 7,
          zipCode: '55123',
          homeownerName: 'Alex Martin',
          notes: 'Need full tear-off and warranty upgrade.',
        },
      },
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseBody(request);
    const action = parseOptionalString(body.action) || 'score-route';

    if (action !== 'score-route' && action !== 'integration-status') {
      throw new ApiError(400, 'Unsupported action. Use score-route or integration-status.', 'ACTION_NOT_SUPPORTED');
    }

    const integrations = getMarketplaceIntegrations();

    if (action === 'integration-status') {
      return jsonResponse({
        integrations,
        phaseRoadmap: MARKETPLACE_PHASE_ROADMAP,
      });
    }

    const assignmentMode = parseAssignmentMode(body.assignmentMode);
    const claimWindowMinutes = parseNumber(body.claimWindowMinutes, 15, 3, 60);
    const lead = parseLead(body.lead);

    const routing = await routeMarketplaceLeadWithMaps({
      lead,
      assignmentMode,
      claimWindowMinutes,
    });

    return jsonResponse(
      {
        integrations,
        routing,
        phaseRoadmap: MARKETPLACE_PHASE_ROADMAP,
      },
      201
    );
  });
}
