import { crmDb } from '@/src/crm/core/crmDb';
import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseLimit,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import { CloseService } from '@/src/crm/modules/close';

const closeService = new CloseService();

type CreateInvoiceBody = {
  leadId?: string;
  proposalId?: string;
  totalCents?: number;
  dueAt?: string;
};

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const url = new URL(request.url);
    const leadId = parseOptionalString(url.searchParams.get('leadId'));
    const limit = parseLimit(request, 50, 1, 200);

    const invoices = await crmDb.invoice.findMany({
      where: leadId ? { leadId } : undefined,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: true,
        proposal: true,
      },
    });

    return jsonResponse({ invoices, count: invoices.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<CreateInvoiceBody>(request);
    const leadId = parseOptionalString(body.leadId);

    if (!leadId || !Number.isFinite(Number(body.totalCents))) {
      return jsonResponse({ error: 'leadId and totalCents are required' }, 400);
    }

    const invoice = await closeService.createInvoice({
      leadId,
      proposalId: parseOptionalString(body.proposalId),
      totalCents: Math.max(0, Math.floor(Number(body.totalCents))),
      dueAt: parseOptionalString(body.dueAt),
    });

    return jsonResponse({ invoice }, 201);
  });
}
