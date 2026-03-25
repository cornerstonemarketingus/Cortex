import { requireCrmAdmin } from '@/src/crm/core/auth';
import { jsonResponse, withApiHandler } from '@/src/crm/core/http';
import { NurtureService } from '@/src/crm/modules/nurture';

const nurtureService = new NurtureService();

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAdmin(request);
    const workflow = await nurtureService.seedMissedCallAutomation();
    return jsonResponse({ workflow }, 201);
  });
}
