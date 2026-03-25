import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, parseStringArray, withApiHandler } from '@/src/crm/core/http';
import { generateSandboxPreview, type SandboxBlueprint } from '@/src/builder/sandbox-preview';

export const runtime = 'nodejs';

type SandboxPreviewBody = {
  blueprint?: unknown;
  prompt?: unknown;
  sections?: unknown;
  modules?: unknown;
  projectName?: unknown;
};

function parseBlueprint(value: unknown): SandboxBlueprint {
  if (value === 'website' || value === 'app' || value === 'business' || value === 'game') {
    return value;
  }
  return 'website';
}

async function parseBody(request: Request): Promise<SandboxPreviewBody> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new ApiError(400, 'Request body is required.', 'MISSING_BODY');
  }

  try {
    return JSON.parse(raw) as SandboxPreviewBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      notes:
        'POST blueprint + prompt to generate a renderable sandbox preview HTML for website, app, business, or game flows.',
      supportedBlueprints: ['website', 'app', 'business', 'game'],
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseBody(request);
    const prompt = parseOptionalString(body.prompt) || 'Generate a live sandbox preview';
    const blueprint = parseBlueprint(body.blueprint);

    const preview = generateSandboxPreview({
      blueprint,
      prompt,
      sections: parseStringArray(body.sections) || [],
      modules: parseStringArray(body.modules) || [],
      projectName: parseOptionalString(body.projectName),
    });

    return jsonResponse({ preview }, 201);
  });
}
