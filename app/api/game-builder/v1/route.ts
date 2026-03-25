import { readJson } from '@/src/crm/core/api';
import {
  jsonResponse,
  parseBoolean,
  parseOptionalString,
  parseStringArray,
  withApiHandler,
} from '@/src/crm/core/http';
import { appendTaskDrafts } from '@/src/cto/taskQueue';
import { createGameBuilderPlan, listGameBuilderTracks, type GameBuilderMonetization } from '@/src/game-builder/v1';
import { requireOperatorAccess } from '@/src/security/operatorAuth';

export const runtime = 'nodejs';

type CreatePlanBody = {
  projectName?: unknown;
  track?: unknown;
  genre?: unknown;
  audience?: unknown;
  coreLoop?: unknown;
  monetization?: unknown;
  aiFeatures?: unknown;
  includeMarketplacePack?: unknown;
  includeLiveOps?: unknown;
  enqueueToCto?: unknown;
};

function parseTrack(value?: string) {
  if (value === 'roblox' || value === 'cross-platform' || value === 'marketplace') {
    return value;
  }
  return 'roblox';
}

function parseMonetization(value?: string): GameBuilderMonetization {
  if (value === 'free-to-play' || value === 'premium' || value === 'hybrid') {
    return value;
  }
  return 'hybrid';
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      tracks: listGameBuilderTracks(),
      monetizationModels: ['free-to-play', 'premium', 'hybrid'],
      defaultAiFeatures: [
        'npc-behavior-coach',
        'economy-balance-assistant',
        'quest-generation-engine',
        'player-retention-analytics',
      ],
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<CreatePlanBody>(request);

    const projectName = parseOptionalString(body.projectName) || 'cortex-game-v1';
    const track = parseTrack(parseOptionalString(body.track));
    const genre = parseOptionalString(body.genre) || 'simulation';
    const audience = parseOptionalString(body.audience) || 'builders and creators';
    const coreLoop = parseOptionalString(body.coreLoop) || 'explore, complete objectives, and upgrade progression';
    const monetization = parseMonetization(parseOptionalString(body.monetization));
    const aiFeatures = parseStringArray(body.aiFeatures) || [];
    const includeMarketplacePack = parseBoolean(body.includeMarketplacePack, true);
    const includeLiveOps = parseBoolean(body.includeLiveOps, true);
    const enqueueToCto = parseBoolean(body.enqueueToCto, false);

    const plan = createGameBuilderPlan({
      projectName,
      track,
      genre,
      audience,
      coreLoop,
      monetization,
      aiFeatures,
      includeMarketplacePack,
      includeLiveOps,
    });

    let queue: { added: number; total: number } | undefined;
    if (enqueueToCto) {
      await requireOperatorAccess(request, { adminOnly: true });
      const result = await appendTaskDrafts(plan.ctoTaskDrafts, {
        dedupeByDescription: true,
        idPrefix: 'game-v1',
      });

      queue = {
        added: result.added.length,
        total: result.total,
      };
    }

    return jsonResponse(
      {
        plan,
        queue,
      },
      201
    );
  });
}
