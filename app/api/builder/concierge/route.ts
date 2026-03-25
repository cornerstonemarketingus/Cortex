import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { generateBuilderConciergeResponse } from '@/src/builder/concierge';

export const runtime = 'nodejs';

type ConciergeBody = {
  message?: unknown;
  blueprint?: unknown;
  mode?: unknown;
  includeDomainSales?: unknown;
  includeAutonomousIdeas?: unknown;
};

function parseBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

async function parseBody(request: Request): Promise<ConciergeBody> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new ApiError(400, 'Message is required.', 'MISSING_BODY');
  }

  try {
    return JSON.parse(raw) as ConciergeBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      examples: [
        'Build a website and app for a local cleaning service with booking + CRM follow-up.',
        'Help me ship a SaaS MVP and create a sales system to close leads faster.',
        'Create a conversion-first landing page and domain options for my AI product.',
      ],
      notes: 'POST a message to get a build plan, modules, sales prompts, voice scripts, and domain suggestions.',
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseBody(request);
    const message = parseOptionalString(body.message);

    if (!message) {
      throw new ApiError(400, 'Message is required.', 'MESSAGE_REQUIRED');
    }

    const response = generateBuilderConciergeResponse({
      message,
      blueprint: parseOptionalString(body.blueprint),
      mode: body.mode === 'operator' ? 'operator' : 'visitor',
      includeDomainSales: parseBoolean(body.includeDomainSales, true),
      includeAutonomousIdeas: parseBoolean(body.includeAutonomousIdeas, true),
    });

    return jsonResponse({
      response,
    });
  });
}
