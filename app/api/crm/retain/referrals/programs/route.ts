import { readJson } from '@/src/crm/core/api';
import { requireCrmAdmin, requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseLimit,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import { RetainService } from '@/src/crm/modules/retain';

const retainService = new RetainService();

type ProgramBody = {
  name?: string;
  rewardCents?: number;
};

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const limit = parseLimit(request, 50, 1, 200);
    const programs = await retainService.listReferralPrograms(limit);
    return jsonResponse({ programs, count: programs.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAdmin(request);

    const body = await readJson<ProgramBody>(request);
    const name = parseOptionalString(body.name);
    const rewardCents = Math.floor(Number(body.rewardCents));

    if (!name || !Number.isFinite(rewardCents) || rewardCents <= 0) {
      return jsonResponse({ error: 'name and positive rewardCents are required' }, 400);
    }

    const program = await retainService.createReferralProgram({
      name,
      rewardCents,
    });

    return jsonResponse({ program }, 201);
  });
}
