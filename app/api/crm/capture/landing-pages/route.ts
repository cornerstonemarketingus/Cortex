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

type LandingPageBody = {
  name?: string;
  slug?: string;
  configJson?: unknown;
  isPublished?: unknown;
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const landingPages = await captureService.listLandingPages();
    return jsonResponse({ landingPages, count: landingPages.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAdmin(request);
    const body = await readJson<LandingPageBody>(request);

    const name = parseOptionalString(body.name);
    if (!name) {
      return jsonResponse({ error: 'name is required' }, 400);
    }

    const slug = parseOptionalString(body.slug) || slugify(name);
    if (!slug) {
      return jsonResponse({ error: 'A valid slug could not be generated' }, 400);
    }

    const landingPage = await captureService.saveLandingPage({
      name,
      slug,
      configJson: parseRecord(body.configJson),
      isPublished: parseBoolean(body.isPublished, false),
    });

    return jsonResponse({ landingPage }, 201);
  });
}
