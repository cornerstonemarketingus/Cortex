import { crmDb } from '@/src/crm/core/crmDb';
import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseLimit,
  parseOptionalString,
  parseRecord,
  withApiHandler,
} from '@/src/crm/core/http';
import { CloseService, type ProposalLineItem } from '@/src/crm/modules/close';

const closeService = new CloseService();

type CreateProposalBody = {
  leadId?: string;
  title?: string;
  lineItems?: unknown;
  notes?: string;
};

function normalizeLineItems(value: unknown): ProposalLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const record = parseRecord(item);
      return {
        label: parseOptionalString(record.label) || 'Item',
        quantity: Math.max(1, Number(record.quantity) || 1),
        unitPriceCents: Math.max(0, Math.floor(Number(record.unitPriceCents) || 0)),
      };
    })
    .filter((item) => item.unitPriceCents > 0);
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const url = new URL(request.url);
    const limit = parseLimit(request, 50, 1, 200);
    const leadId = parseOptionalString(url.searchParams.get('leadId'));

    const proposals = await crmDb.proposal.findMany({
      where: leadId ? { leadId } : undefined,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: true,
      },
    });

    return jsonResponse({ proposals, count: proposals.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<CreateProposalBody>(request);
    const leadId = parseOptionalString(body.leadId);
    const title = parseOptionalString(body.title);

    if (!leadId || !title) {
      return jsonResponse({ error: 'leadId and title are required' }, 400);
    }

    const proposal = await closeService.createProposal({
      leadId,
      title,
      lineItems: normalizeLineItems(body.lineItems),
      notes: parseOptionalString(body.notes),
    });

    return jsonResponse({ proposal }, 201);
  });
}
