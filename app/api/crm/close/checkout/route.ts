import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseBoolean,
  parseOptionalString,
  parseRecord,
  withApiHandler,
} from '@/src/crm/core/http';
import { CloseService } from '@/src/crm/modules/close';

const closeService = new CloseService();

type CheckoutBody = {
  leadId?: string;
  items?: unknown;
  successUrl?: string;
  cancelUrl?: string;
};

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const record = parseRecord(item);
      const productId = parseOptionalString(record.productId);
      if (!productId) {
        return null;
      }

      return {
        productId,
        quantity: Math.max(1, Math.floor(Number(record.quantity) || 1)),
        isUpsell: parseBoolean(record.isUpsell, false),
        isDownsell: parseBoolean(record.isDownsell, false),
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item);
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<CheckoutBody>(request);
    const leadId = parseOptionalString(body.leadId);
    const successUrl = parseOptionalString(body.successUrl);
    const cancelUrl = parseOptionalString(body.cancelUrl);
    const items = normalizeItems(body.items);

    if (!leadId || !successUrl || !cancelUrl || items.length === 0) {
      return jsonResponse(
        { error: 'leadId, successUrl, cancelUrl, and at least one valid item are required' },
        400
      );
    }

    const checkout = await closeService.createCheckout({
      leadId,
      items,
      successUrl,
      cancelUrl,
    });

    return jsonResponse({ checkout }, 201);
  });
}
