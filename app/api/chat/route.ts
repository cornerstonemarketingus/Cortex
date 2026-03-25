import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { toApiError } from '@/src/crm/core/api';
import { parseBoolean } from '@/src/crm/core/http';
import { callOpenAiChat, type AiMessage, type ConversationTone } from '@/src/crm/core/openai';
import { buildRolloutTasks, listSystemModules, type RolloutScope } from '@/src/crm/modules/platform';
import { createGameBuilderPlan } from '@/src/game-builder/v1';
import { createBlogPost } from '@/src/content/blog-engine';
import { appendTaskDrafts } from '@/src/cto/taskQueue';
import { requireOperatorAccess } from '@/src/security/operatorAuth';
import { prisma } from '@/lib/prisma';
import {
  BOT_DEFINITIONS,
  buildRoleResponse,
  normalizeBotIds,
  sanitizePrompt,
} from '@/lib/chatBots';

export const runtime = 'nodejs';

type ChatMode = 'assistant' | 'bots' | 'automation';

type ChatRequest = {
  task?: unknown;
  message?: unknown;
  botIds?: unknown;
  mode?: unknown;
  provider?: unknown;
  tone?: unknown;
  systemPrompt?: unknown;
  history?: unknown;
  automation?: unknown;
  includeCapabilities?: unknown;
  includeTeamDecision?: unknown;
  learnFromMemory?: unknown;
};

type ChatHistoryMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AutomationRequest = {
  action?: unknown;
  scope?: unknown;
  limit?: unknown;
  enqueueToCto?: unknown;
  projectName?: unknown;
  track?: unknown;
  genre?: unknown;
  audience?: unknown;
  coreLoop?: unknown;
  monetization?: unknown;
  includeMarketplacePack?: unknown;
  includeLiveOps?: unknown;
  aiFeatures?: unknown;
  topic?: unknown;
  businessType?: unknown;
  region?: unknown;
  cityFocus?: unknown;
  primaryKeyword?: unknown;
  secondaryKeywords?: unknown;
  callToAction?: unknown;
};

type AutomationResult = {
  type: 'rollout' | 'game-plan' | 'blog-campaign' | 'systems-overview';
  payload: Record<string, unknown>;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_MAX_REQUESTS = Number(process.env.CORTEX_CHAT_RATE_LIMIT_MAX || 30);
const RATE_LIMIT_WINDOW_MS = Number(process.env.CORTEX_CHAT_RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_BOTS_PER_REQUEST = 12;
const MAX_HISTORY_MESSAGES = 20;

const CHAT_CAPABILITIES = {
  modes: ['assistant', 'bots', 'automation'],
  providers: ['auto', 'openai', 'local'],
  tools: ['system-rollout', 'game-builder-v1', 'blog-engine', 'systems-catalog', 'cto-queue-enqueue'],
  integrations: ['crm-workflows', 'builder-blueprints', 'blog-content-ops', 'marketplace-planning', 'cto-task-queue'],
  maxBotsPerRequest: MAX_BOTS_PER_REQUEST,
  maxHistoryMessages: MAX_HISTORY_MESSAGES,
};

const globalForRateLimit = globalThis as unknown as {
  chatRateMap?: Map<string, RateLimitEntry>;
};

const chatRateMap = globalForRateLimit.chatRateMap || new Map<string, RateLimitEntry>();
if (!globalForRateLimit.chatRateMap) {
  globalForRateLimit.chatRateMap = chatRateMap;
}

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown-client';
}

function evaluateRateLimit(clientId: string) {
  const now = Date.now();
  const current = chatRateMap.get(clientId);

  if (!current || now >= current.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    chatRateMap.set(clientId, { count: 1, resetAt });
    return {
      limited: false,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - 1),
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    };
  }

  current.count += 1;
  chatRateMap.set(clientId, current);

  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

  return {
    limited: current.count > RATE_LIMIT_MAX_REQUESTS,
    remaining,
    retryAfterSeconds,
  };
}

function parseMode(value: unknown): ChatMode | null {
  if (value === 'assistant' || value === 'bots' || value === 'automation') {
    return value;
  }
  return null;
}

function parseProvider(value: unknown): 'auto' | 'openai' | 'local' {
  if (value === 'openai' || value === 'local' || value === 'auto') {
    return value;
  }
  return 'auto';
}

function parseTone(value: unknown): ConversationTone {
  if (value === 'sales' || value === 'support' || value === 'friendly') {
    return value;
  }
  return 'friendly';
}

function parseScope(value: unknown): RolloutScope {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!raw) return 'missing';

  const valid: RolloutScope[] = [
    'all',
    'missing',
    'capture',
    'nurture',
    'close',
    'evangelize',
    'reactivate',
    'game-builder',
    'business-builder',
    'conversation-ai',
  ];

  return valid.includes(raw as RolloutScope) ? (raw as RolloutScope) : 'missing';
}

function parseTrack(value: unknown): 'roblox' | 'cross-platform' | 'marketplace' {
  if (value === 'roblox' || value === 'cross-platform' || value === 'marketplace') {
    return value;
  }
  return 'roblox';
}

function normalizeHistory(value: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as { role?: unknown; content?: unknown; text?: unknown };
      const role = candidate.role;
      const contentRaw = typeof candidate.content === 'string'
        ? candidate.content
        : typeof candidate.text === 'string'
        ? candidate.text
        : '';
      const content = sanitizePrompt(contentRaw);

      if (!content) return null;
      if (role !== 'system' && role !== 'user' && role !== 'assistant') return null;

      return {
        role,
        content,
      } satisfies ChatHistoryMessage;
    })
    .filter((item): item is ChatHistoryMessage => item !== null)
    .slice(-MAX_HISTORY_MESSAGES);
}

function parseStringList(value: unknown, limit = 8): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => sanitizePrompt(item))
      .filter((item) => item.length > 0)
      .slice(0, limit);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => sanitizePrompt(item))
      .filter((item) => item.length > 0)
      .slice(0, limit);
  }

  return [];
}

async function loadLearningSignals(limit = 8): Promise<string[]> {
  if (!prisma) return [];

  try {
    const entries = await prisma.memory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { agent: true, message: true },
    });

    return entries
      .map((entry) => `${entry.agent}: ${sanitizePrompt(entry.message).slice(0, 180)}`)
      .filter((entry) => entry.length > 0);
  } catch {
    return [];
  }
}

async function buildTeamDecisionSummary(
  provider: 'auto' | 'openai' | 'local',
  tone: ConversationTone,
  prompt: string,
  results: Array<{ agent: string; result: string }>
): Promise<string> {
  const teamRoles = BOT_DEFINITIONS.map((bot) => `${bot.name} (${bot.role})`).join(', ');
  const compiled = results.map((item) => `- ${item.agent}: ${item.result}`).join('\n');

  if (provider !== 'local') {
    try {
      return await callOpenAiChat(
        [
          {
            role: 'user',
            content: [
              'You are the council orchestrator for a 12-agent AI team.',
              `Team role roster: ${teamRoles}`,
              `User objective: ${prompt}`,
              'Synthesize one team decision and execution plan from these agent outputs.',
              'Return concise sections: Team Decision, Why, First 3 Actions.',
              '',
              compiled,
            ].join('\n'),
          },
        ],
        tone
      );
    } catch {
      // Fall through to deterministic local summary.
    }
  }

  const lead = results[0];
  const second = results[1];
  const third = results[2];

  return [
    `Team Decision: Execute a combined strategy for "${prompt}" with shared ownership across the 12-agent council.`,
    `Why: ${lead ? `${lead.agent} set direction` : 'Council alignment'}${second ? `, ${second.agent} validated feasibility` : ''}${third ? `, and ${third.agent} defined delivery quality.` : '.'}`,
    'First 3 Actions:',
    `1) Lock scope and success metric from the council brief.`,
    `2) Implement the smallest production-safe increment and verify with tests/build.`,
    `3) Review feedback signals, then iterate with a new council pass.`,
  ].join('\n');
}

async function buildAutomationResponse(
  request: Request,
  prompt: string,
  automation: AutomationRequest | null,
  tone: ConversationTone
): Promise<{ text: string; data: AutomationResult }> {
  const actionRaw = typeof automation?.action === 'string' ? automation.action.trim().toLowerCase() : '';
  const wantsRollout = actionRaw === 'rollout'
    || /implement|rollout|ship|build all|pending|planned/i.test(prompt);
  const wantsGamePlan = actionRaw === 'game-plan'
    || /game builder|roblox|game plan|marketplace game/i.test(prompt);
  const wantsBlogCampaign = actionRaw === 'blog-campaign'
    || /blog engine|seo blog|geo blog|content campaign|publish blog|local seo article/i.test(prompt);

  if (wantsGamePlan) {
    const aiFeatures = Array.isArray(automation?.aiFeatures)
      ? automation.aiFeatures.filter((item): item is string => typeof item === 'string').slice(0, 8)
      : [];
    const plan = createGameBuilderPlan({
      projectName: sanitizePrompt(automation?.projectName) || 'cortex-game-v1',
      track: parseTrack(automation?.track),
      genre: sanitizePrompt(automation?.genre) || 'simulation',
      audience: sanitizePrompt(automation?.audience) || 'creator economy players',
      coreLoop: sanitizePrompt(automation?.coreLoop) || 'explore, complete objectives, and upgrade progression',
      monetization: automation?.monetization === 'free-to-play' || automation?.monetization === 'premium' || automation?.monetization === 'hybrid'
        ? automation.monetization
        : 'hybrid',
      aiFeatures,
      includeMarketplacePack: parseBoolean(automation?.includeMarketplacePack, true),
      includeLiveOps: parseBoolean(automation?.includeLiveOps, true),
    });

    let queue: { added: number; total: number } | undefined;
    if (parseBoolean(automation?.enqueueToCto, false)) {
      await requireOperatorAccess(request, { adminOnly: true });
      const appendResult = await appendTaskDrafts(plan.ctoTaskDrafts, {
        dedupeByDescription: true,
        idPrefix: 'chat-game-v1',
      });

      queue = {
        added: appendResult.added.length,
        total: appendResult.total,
      };
    }

    return {
      text: `Game Builder V1 plan ready: ${plan.buildId}. Milestones: ${plan.milestones.length}. CTO task drafts: ${plan.ctoTaskDrafts.length}${queue ? `. Queued: ${queue.added}.` : '.'}`,
      data: {
        type: 'game-plan',
        payload: {
          buildId: plan.buildId,
          track: plan.trackSummary,
          milestones: plan.milestones,
          ctoTaskDrafts: plan.ctoTaskDrafts,
          queue,
        },
      },
    };
  }

  if (wantsBlogCampaign) {
    const post = await createBlogPost({
      topic: sanitizePrompt(automation?.topic) || prompt,
      businessType: sanitizePrompt(automation?.businessType) || 'AI software and growth services',
      audience: sanitizePrompt(automation?.audience) || 'founders, operators, and growth teams',
      region: sanitizePrompt(automation?.region)?.toLowerCase() as
        | 'global'
        | 'north-america'
        | 'latin-america'
        | 'europe'
        | 'middle-east-africa'
        | 'asia-pacific'
        | undefined,
      cityFocus: parseStringList(automation?.cityFocus, 6),
      primaryKeyword: sanitizePrompt(automation?.primaryKeyword) || 'ai app and website builder',
      secondaryKeywords: parseStringList(automation?.secondaryKeywords, 8),
      callToAction: sanitizePrompt(automation?.callToAction) || 'Book a strategy call and launch your build in 7 days.',
      tone,
    });

    let queue: { added: number; total: number } | undefined;
    if (parseBoolean(automation?.enqueueToCto, false)) {
      await requireOperatorAccess(request, { adminOnly: true });
      const appendResult = await appendTaskDrafts(
        post.tasks.map((task) => ({
          type: 'feature',
          description: `[Blog Engine] ${task.title}: ${post.seo.title}`,
          metadata: {
            pipeline: 'chat-blog-engine',
            blogPostId: post.id,
            blogSlug: post.seo.slug,
            ownerRole: task.ownerRole,
            region: post.region,
          },
        })),
        {
          dedupeByDescription: true,
          idPrefix: 'chat-blog',
        }
      );

      queue = {
        added: appendResult.added.length,
        total: appendResult.total,
      };
    }

    return {
      text: `Blog campaign generated: ${post.seo.title}. Slug: ${post.seo.slug}. Tasks: ${post.tasks.length}${queue ? `. Queued ${queue.added} tasks.` : '.'}`,
      data: {
        type: 'blog-campaign',
        payload: {
          postId: post.id,
          slug: post.seo.slug,
          title: post.seo.title,
          region: post.region,
          keyword: post.seo.primaryKeyword,
          taskCount: post.tasks.length,
          estimatedCostUsd: post.operations.estimatedCostUsd,
          turnaroundHours: post.operations.turnaroundHours,
          queue,
        },
      },
    };
  }

  if (wantsRollout) {
    const limitRaw = Number(automation?.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(Math.floor(limitRaw), 100)) : 20;
    const scope = parseScope(automation?.scope);
    const rolloutPlan = buildRolloutTasks({ scope, limit });

    let queue: { added: number; total: number } | undefined;
    if (parseBoolean(automation?.enqueueToCto, false)) {
      await requireOperatorAccess(request, { adminOnly: true });
      const appendResult = await appendTaskDrafts(
        rolloutPlan.tasks.map((task) => ({
          type: task.type,
          description: task.description,
          metadata: {
            moduleId: task.moduleId,
            phase: task.phase,
            priority: task.priority,
            scope,
          },
        })),
        {
          dedupeByDescription: true,
          idPrefix: 'chat-rollout',
        }
      );

      queue = {
        added: appendResult.added.length,
        total: appendResult.total,
      };
    }

    return {
      text: `Rollout plan generated for scope ${scope}: ${rolloutPlan.totalTasks} immediate tasks${queue ? `. Queued ${queue.added} tasks.` : '.'}`,
      data: {
        type: 'rollout',
        payload: {
          scope,
          totalTasks: rolloutPlan.totalTasks,
          tasks: rolloutPlan.tasks,
          queue,
        },
      },
    };
  }

  const systems = listSystemModules({
    search: prompt,
    limit: 12,
  });

  const summary = systems.map((system) => `${system.name} [${system.status}]`).join('; ');
  return {
    text: systems.length > 0
      ? `Systems overview: ${summary}`
      : 'No system modules matched your query. Try a broader prompt.',
    data: {
      type: 'systems-overview',
      payload: {
        count: systems.length,
        systems,
      },
    },
  };
}

export async function GET() {
  return NextResponse.json({
    capabilities: CHAT_CAPABILITIES,
    bots: BOT_DEFINITIONS,
  });
}

export async function POST(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rate = evaluateRateLimit(clientId);
    if (rate.limited) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for chat requests. Please retry shortly.',
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.retryAfterSeconds),
          },
        }
      );
    }

    const body = (await request.json().catch(() => null)) as ChatRequest | null;
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const rawPrompt = typeof body.message === 'string'
      ? body.message
      : typeof body.task === 'string'
      ? body.task
      : '';

    const prompt = sanitizePrompt(rawPrompt);
    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing message or task' },
        { status: 400 }
      );
    }

    const explicitMode = parseMode(body.mode);
    const automationRequest = (body.automation && typeof body.automation === 'object')
      ? (body.automation as AutomationRequest)
      : null;

    const mode: ChatMode = explicitMode
      || (automationRequest ? 'automation' : Array.isArray(body.botIds) ? 'bots' : 'assistant');

    const provider = parseProvider(body.provider);
    const tone = parseTone(body.tone);
    const systemPrompt = sanitizePrompt(body.systemPrompt);
    const history = normalizeHistory(body.history);

    const requestedBotIds = normalizeBotIds(body.botIds);
    const activeBotIds = requestedBotIds.length > 0 ? requestedBotIds : [1];
    if (activeBotIds.length > MAX_BOTS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Select up to ${MAX_BOTS_PER_REQUEST} bots per request` },
        { status: 400 }
      );
    }

    const results: { agent: string; result: string }[] = [];
    let teamDecision: string | undefined;
    const includeTeamDecision = parseBoolean(body.includeTeamDecision, false);
    const learnFromMemory = parseBoolean(body.learnFromMemory, false);
    const learningSignals = learnFromMemory ? await loadLearningSignals() : [];
    const learningContext = learningSignals.length > 0
      ? `\n\nLearning signals from recent user interactions:\n${learningSignals.join('\n')}`
      : '';
    const effectivePrompt = `${prompt}${learningContext}`;

    let automation: AutomationResult | undefined;

    if (mode === 'automation') {
      const automationResponse = await buildAutomationResponse(request, prompt, automationRequest, tone);
      results.push({
        agent: 'Automation Orchestrator',
        result: automationResponse.text,
      });
      automation = automationResponse.data;
    } else if (mode === 'assistant') {
      const aiMessages: AiMessage[] = [];
      if (systemPrompt) {
        aiMessages.push({ role: 'system', content: systemPrompt });
      }

      aiMessages.push(...history.map((item) => ({ role: item.role, content: item.content })));
      aiMessages.push({ role: 'user', content: effectivePrompt });

      const useLocal = provider === 'local';
      const resultText = useLocal
        ? buildRoleResponse('AI Visionary', effectivePrompt)
        : await callOpenAiChat(aiMessages, tone);

      results.push({
        agent: useLocal ? 'Cortex Local Assistant' : 'Cortex Assistant',
        result: resultText,
      });
    } else {
      for (const id of activeBotIds) {
        const bot = BOT_DEFINITIONS[id - 1];
        if (!bot) continue;

        const agent = bot.name;
        const resultText = buildRoleResponse(agent, effectivePrompt);
        results.push({ agent, result: resultText });
      }

      if (includeTeamDecision && results.length > 1) {
        teamDecision = await buildTeamDecisionSummary(provider, tone, prompt, results);
      }
    }

    const ops = results.map((entry) => {
      if (!prisma) return null;
      return prisma.memory.create({ data: { agent: entry.agent, message: entry.result } });
    });

    if (prisma) {
      try {
        const validOps = ops.filter((op): op is NonNullable<typeof op> => op !== null);
        if (validOps.length > 0) {
          await prisma.$transaction(validOps);
        }
      } catch (dbError) {
        console.warn('Skipping chat memory persistence:', dbError);
      }
    }

    const responses = results.map((entry) => entry.result);
    const requestId = randomUUID();

    return NextResponse.json({
      requestId,
      createdAt: new Date().toISOString(),
      mode,
      provider,
      task: prompt,
      botIds: activeBotIds,
      responses,
      results,
      teamDecision,
      teamProfile: BOT_DEFINITIONS.map((bot) => ({
        id: bot.id,
        name: bot.name,
        role: bot.role,
      })),
      learningSignals: learningSignals.slice(0, 6),
      automation,
      capabilities: parseBoolean(body.includeCapabilities, false) ? CHAT_CAPABILITIES : undefined,
      rateLimit: {
        remaining: rate.remaining,
        windowMs: RATE_LIMIT_WINDOW_MS,
      },
    });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      {
        error: apiError.message,
        code: apiError.code,
        details: apiError.details,
      },
      { status: apiError.status }
    );
  }
}

