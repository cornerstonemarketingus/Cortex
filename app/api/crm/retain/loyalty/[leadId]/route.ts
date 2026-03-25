import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, withApiHandler } from '@/src/crm/core/http';
import { RetainService } from '@/src/crm/modules/retain';

const retainService = new RetainService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const { leadId } = await params;

    const account = await retainService.getLoyaltyAccountByLeadId(leadId);
    return jsonResponse({ account });
  });
}
