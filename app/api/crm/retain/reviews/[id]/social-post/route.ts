import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, withApiHandler } from '@/src/crm/core/http';
import { RetainService } from '@/src/crm/modules/retain';

const retainService = new RetainService();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const { id } = await params;

    const result = await retainService.queueSocialPostFromReview(id);
    return jsonResponse({ result }, 201);
  });
}
