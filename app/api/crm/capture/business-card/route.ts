import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseBoolean,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';

type BusinessCardBody = {
  imageDataUrl?: string;
  rawText?: string;
  createLead?: unknown;
};

const captureService = new LeadCaptureService();

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<BusinessCardBody>(request);

    const imageDataUrl = parseOptionalString(body.imageDataUrl);
    const rawText = parseOptionalString(body.rawText);
    const createLead = parseBoolean(body.createLead, false);

    if (!imageDataUrl && !rawText) {
      return jsonResponse({ error: 'imageDataUrl or rawText is required' }, 400);
    }

    if (createLead) {
      const lead = await captureService.createLeadFromBusinessCard({
        imageDataUrl,
        rawText,
      });
      return jsonResponse({ lead }, 201);
    }

    const parsed = await captureService.scanBusinessCard({
      imageDataUrl,
      rawText,
    });

    return jsonResponse({ parsed });
  });
}
