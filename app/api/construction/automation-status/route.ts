import { jsonResponse, withApiHandler } from '@/src/crm/core/http';
import { getAutomationHealthSnapshot } from '@/src/construction/automation-health.service';

export async function GET() {
  return withApiHandler(async () => {
    const status = await getAutomationHealthSnapshot();
    return jsonResponse({ status });
  });
}
