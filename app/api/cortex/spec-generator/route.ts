import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseBoolean, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { appendTaskDrafts } from '@/src/cto/taskQueue';
import { generateFeatureSpec, type SpecGeneratorAction } from '@/src/cortex/spec-generator';
import { requireOperatorAccess } from '@/src/security/operatorAuth';

export const runtime = 'nodejs';

type SpecBody = {
  prompt?: unknown;
  action?: unknown;
  modificationNotes?: unknown;
  enqueueToCto?: unknown;
};

function parseAction(value: unknown): SpecGeneratorAction {
  if (value === 'approve' || value === 'modify' || value === 'deploy' || value === 'preview') {
    return value;
  }
  return 'preview';
}

async function parseBody(request: Request): Promise<SpecBody> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new ApiError(400, 'Prompt is required.', 'MISSING_BODY');
  }

  try {
    return JSON.parse(raw) as SpecBody;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.', 'INVALID_JSON');
  }
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      examples: [
        'Create a referral rewards system for cleaning businesses',
        'Add loyalty program with tier upgrades and referral bonuses',
        'Build AI follow-up workflow for no-show leads',
      ],
      actions: ['preview', 'approve', 'modify', 'deploy'],
      notes: 'Deploy action can enqueue generated tasks to CTO queue when operator auth is present.',
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await parseBody(request);
    const prompt = parseOptionalString(body.prompt);

    if (!prompt) {
      throw new ApiError(400, 'Prompt is required.', 'PROMPT_REQUIRED');
    }

    const action = parseAction(body.action);

    const spec = generateFeatureSpec({
      prompt,
      action,
      modificationNotes: parseOptionalString(body.modificationNotes),
    });

    let queue: { added: number; total: number } | undefined;
    const wantsQueue = parseBoolean(body.enqueueToCto, action === 'deploy');

    if (wantsQueue) {
      await requireOperatorAccess(request, { adminOnly: true });

      const appendResult = await appendTaskDrafts(
        spec.suggestedCtoTasks.map((description) => ({
          type: 'feature',
          description: `[Build Cortex] ${description}`,
          metadata: {
            pipeline: 'build-cortex-spec-generator',
            action,
          },
        })),
        {
          dedupeByDescription: true,
          idPrefix: 'build-cortex',
        }
      );

      queue = {
        added: appendResult.added.length,
        total: appendResult.total,
      };
    }

    return jsonResponse(
      {
        action,
        spec,
        queue,
      },
      201
    );
  });
}
