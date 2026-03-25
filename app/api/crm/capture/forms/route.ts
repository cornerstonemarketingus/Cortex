import { readJson } from '@/src/crm/core/api';
import { requireCrmAdmin, requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseBoolean,
  parseOptionalString,
  parseRecord,
  withApiHandler,
} from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';

const captureService = new LeadCaptureService();

type CaptureFormBody = {
  name?: string;
  slug?: string;
  schemaJson?: unknown;
  isActive?: unknown;
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const forms = await captureService.listCaptureForms();
    return jsonResponse({ forms, count: forms.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAdmin(request);
    const body = await readJson<CaptureFormBody>(request);

    const name = parseOptionalString(body.name);
    if (!name) {
      return jsonResponse({ error: 'name is required' }, 400);
    }

    const slug = parseOptionalString(body.slug) || slugify(name);
    if (!slug) {
      return jsonResponse({ error: 'A valid slug could not be generated' }, 400);
    }

    const schemaJson = parseRecord(body.schemaJson);

    const form = await captureService.saveCaptureForm({
      name,
      slug,
      schemaJson,
      isActive: parseBoolean(body.isActive, true),
    });

    return jsonResponse({ form }, 201);
  });
}
