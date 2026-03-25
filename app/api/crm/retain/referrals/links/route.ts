import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseLimit,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import { RetainService } from '@/src/crm/modules/retain';

const retainService = new RetainService();

type CreateLinkBody = {
  leadId?: string;
  programId?: string;
};

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const limit = parseLimit(request, 100, 1, 300);
    const url = new URL(request.url);
    const leadId = parseOptionalString(url.searchParams.get('leadId'));
    const links = await retainService.listReferralLinks(limit, leadId);

    return jsonResponse({ links, count: links.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<CreateLinkBody>(request);
    const leadId = parseOptionalString(body.leadId);
    const programId = parseOptionalString(body.programId);

    if (!leadId || !programId) {
      return jsonResponse({ error: 'leadId and programId are required' }, 400);
    }

    const link = await retainService.createReferralLink({
      leadId,
      programId,
    });

    return jsonResponse({ link }, 201);
  });
}
