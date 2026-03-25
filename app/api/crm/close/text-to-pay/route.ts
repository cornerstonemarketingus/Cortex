import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { CloseService } from '@/src/crm/modules/close';

const closeService = new CloseService();

type TextToPayBody = {
  leadId?: string;
  productId?: string;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
};

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<TextToPayBody>(request);

    const leadId = parseOptionalString(body.leadId);
    const productId = parseOptionalString(body.productId);
    const successUrl = parseOptionalString(body.successUrl);
    const cancelUrl = parseOptionalString(body.cancelUrl);

    if (!leadId || !productId || !successUrl || !cancelUrl) {
      return jsonResponse(
        { error: 'leadId, productId, successUrl, and cancelUrl are required' },
        400
      );
    }

    const textToPay = await closeService.createTextToPay({
      leadId,
      productId,
      quantity: Number.isFinite(Number(body.quantity)) ? Math.max(1, Math.floor(Number(body.quantity))) : 1,
      successUrl,
      cancelUrl,
    });

    return jsonResponse({ textToPay }, 201);
  });
}
