import { jsonResponse, requireAdminOrSecret, withApiHandler } from '@/src/crm/core/http';
import { RetainService } from '@/src/crm/modules/retain';

const retainService = new RetainService();

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireAdminOrSecret(request, {
      envName: 'CRM_CRON_SECRET',
      headerName: 'x-crm-cron-secret',
    });

    const result = await retainService.runFollowupCron();
    return jsonResponse({ result });
  });
}
