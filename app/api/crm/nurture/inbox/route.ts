import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, parseLimit, withApiHandler } from '@/src/crm/core/http';
import { NurtureService } from '@/src/crm/modules/nurture';

const nurtureService = new NurtureService();

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const limit = parseLimit(request, 50, 1, 200);
    const inbox = await nurtureService.getUnifiedInbox(limit);
    return jsonResponse({ inbox, count: inbox.length });
  });
}
