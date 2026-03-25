import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';

const captureService = new LeadCaptureService();

type QrBody = {
  formSlug?: string;
  form?: string;
  campaignId?: string;
};

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const url = new URL(request.url);
    const formSlug =
      parseOptionalString(url.searchParams.get('formSlug')) ||
      parseOptionalString(url.searchParams.get('form'));

    if (!formSlug) {
      return jsonResponse({ error: 'formSlug or form query parameter is required' }, 400);
    }

    const campaignId = parseOptionalString(url.searchParams.get('campaignId'));
    const result = await captureService.generateQrForForm(formSlug, campaignId);
    return jsonResponse(result);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<QrBody>(request);
    const formSlug = parseOptionalString(body.formSlug) || parseOptionalString(body.form);

    if (!formSlug) {
      return jsonResponse({ error: 'formSlug is required' }, 400);
    }

    const result = await captureService.generateQrForForm(
      formSlug,
      parseOptionalString(body.campaignId)
    );

    return jsonResponse(result);
  });
}
