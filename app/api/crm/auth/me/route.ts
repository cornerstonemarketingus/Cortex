import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, withApiHandler } from '@/src/crm/core/http';

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const claims = await requireCrmAuth(request);
    return jsonResponse({
      user: {
        id: claims.sub,
        role: claims.role,
        email: claims.email,
        name: claims.name,
      },
    });
  });
}
