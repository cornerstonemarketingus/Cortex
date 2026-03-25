import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, withApiHandler } from '@/src/crm/core/http';
import { NurtureService } from '@/src/crm/modules/nurture';

const nurtureService = new NurtureService();

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const pipeline = await nurtureService.listPipeline();
    return jsonResponse({ pipeline, count: pipeline.length });
  });
}
