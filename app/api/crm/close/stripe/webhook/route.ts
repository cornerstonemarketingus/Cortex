import { withApiHandler, jsonResponse } from '@/src/crm/core/http';
import { CloseService } from '@/src/crm/modules/close';

const closeService = new CloseService();

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const signature = request.headers.get('stripe-signature');
    const payload = await request.text();

    const result = await closeService.handleStripeWebhook(signature, payload);
    return jsonResponse(result);
  });
}
