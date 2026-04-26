import { NextResponse } from 'next/server';
import { callOpenAiChat, type AiMessage, type ConversationTone } from '@/src/crm/core/openai';
import { buildRoleResponse, sanitizePrompt } from '@/lib/chatBots';

export const runtime = 'nodejs';

type CouncilMode = 'graph' | 'parallel' | 'debate';
type CouncilAgent = 'planner' | 'coder' | 'marketing' | 'bd';
type Provider = 'auto' | 'openai' | 'local';

type CouncilRequest = {
  prompt?: unknown;
  mode?: unknown;
  agents?: unknown;
  rounds?: unknown;
  provider?: unknown;
  tone?: unknown;
};

type CouncilStep = {
  round: number;
  agent: CouncilAgent;
  output: string;
};

const MAX_PROMPT_CHARS = 4_000;
const MAX_ROUNDS = 4;
const DEFAULT_AGENTS: CouncilAgent[] = ['planner', 'coder', 'marketing', 'bd'];

const AGENT_BRIEFS: Record<CouncilAgent, { title: string; rolePrompt: string; localName: string }> = {
  planner: {
    title: 'Planner',
    localName: 'Planner',
    rolePrompt: 'You are a planning lead. Convert the user goal into milestones, dependencies, risks, and success metrics.',
  },
  coder: {
    title: 'Coder',
    localName: 'Backend Engineer',
    rolePrompt: 'You are a senior software engineer. Focus on implementation approach, architecture, testing, and rollout safety.',
  },
  marketing: {
    title: 'Marketing Executive',
    localName: 'Growth Marketer',
    rolePrompt: 'You are a marketing executive. Focus on positioning, messaging, funnel strategy, and conversion metrics.',
  },
  bd: {
    title: 'Business Development Executive',
    localName: 'Launch Strategist',
    rolePrompt: 'You are a business development executive. Focus on offers, partnerships, sales motion, and commercial packaging.',
  },
};

function parseTone(value: unknown): ConversationTone {
  if (value === 'sales' || value === 'support' || value === 'friendly') return value;
  return 'friendly';
}

function parseProvider(value: unknown): Provider {
  if (value === 'openai' || value === 'local' || value === 'auto') return value;
  return 'auto';
}

function parseMode(value: unknown): CouncilMode {
  if (value === 'graph' || value === 'parallel' || value === 'debate') return value;
  return 'graph';
}

function parseRounds(value: unknown): number {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 2;
  return Math.max(1, Math.min(Math.floor(raw), MAX_ROUNDS));
}

function parseAgents(value: unknown): CouncilAgent[] {
  if (!Array.isArray(value)) return DEFAULT_AGENTS;
  const selected = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is CouncilAgent => item === 'planner' || item === 'coder' || item === 'marketing' || item === 'bd');
  return selected.length > 0 ? Array.from(new Set(selected)) : DEFAULT_AGENTS;
}

async function runAgent(
  agent: CouncilAgent,
  userPrompt: string,
  context: string,
  provider: Provider,
  tone: ConversationTone,
): Promise<string> {
  const brief = AGENT_BRIEFS[agent];
  if (provider === 'local') {
    return buildRoleResponse(brief.localName, `${userPrompt}\n${context}`.trim());
  }

  const messages: AiMessage[] = [
    { role: 'system', content: brief.rolePrompt },
    {
      role: 'user',
      content: [
        `User objective: ${userPrompt}`,
        context ? `Current council context:\n${context}` : '',
        'Return concise bullet points and concrete recommendations.',
      ].filter(Boolean).join('\n\n'),
    },
  ];
  return callOpenAiChat(messages, tone);
}

async function synthesizeDecision(
  prompt: string,
  steps: CouncilStep[],
  provider: Provider,
  tone: ConversationTone,
): Promise<string> {
  const transcript = steps
    .map((step) => `Round ${step.round} - ${AGENT_BRIEFS[step.agent].title}: ${step.output}`)
    .join('\n\n');

  if (provider === 'local') {
    return [
      `Team Decision for "${prompt}":`,
      '1) Prioritize a staged rollout with clear KPIs.',
      '2) Implement the smallest production-safe increment first.',
      '3) Align messaging and sales packaging before broader launch.',
      '',
      'Evidence:',
      transcript.slice(0, 1500),
    ].join('\n');
  }

  return callOpenAiChat(
    [
      {
        role: 'user',
        content: [
          'Synthesize a council transcript into one final plan.',
          `Objective: ${prompt}`,
          transcript,
          'Return sections: Final Decision, Execution Plan (first 5 actions), Risks, Metrics.',
        ].join('\n\n'),
      },
    ],
    tone,
  );
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      endpoint: '/api/ai/council',
      modes: ['graph', 'parallel', 'debate'] as CouncilMode[],
      agents: Object.keys(AGENT_BRIEFS),
      maxRounds: MAX_ROUNDS,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as CouncilRequest | null;
    if (!body) return jsonError('Invalid JSON body', 400);

    const prompt = sanitizePrompt(body.prompt);
    if (!prompt) return jsonError('Missing prompt', 400);
    if (prompt.length > MAX_PROMPT_CHARS) {
      return jsonError(`Prompt too long. Max ${MAX_PROMPT_CHARS} characters.`, 413);
    }

    const mode = parseMode(body.mode);
    const provider = parseProvider(body.provider);
    const tone = parseTone(body.tone);
    const rounds = parseRounds(body.rounds);
    const agents = parseAgents(body.agents);
    const steps: CouncilStep[] = [];

    if (mode === 'parallel') {
      const outputs = await Promise.all(
        agents.map(async (agent) => ({
          round: 1,
          agent,
          output: await runAgent(agent, prompt, '', provider, tone),
        })),
      );
      steps.push(...outputs);
    } else if (mode === 'graph') {
      let handoff = '';
      for (const agent of agents) {
        const output = await runAgent(agent, prompt, handoff, provider, tone);
        steps.push({ round: 1, agent, output });
        handoff = `${handoff}\n${AGENT_BRIEFS[agent].title}: ${output}`.trim();
      }
    } else {
      let context = '';
      for (let round = 1; round <= rounds; round += 1) {
        for (const agent of agents) {
          const output = await runAgent(agent, prompt, context, provider, tone);
          steps.push({ round, agent, output });
          context = `${context}\nRound ${round} ${AGENT_BRIEFS[agent].title}: ${output}`.trim();
        }
      }
    }

    const finalDecision = await synthesizeDecision(prompt, steps, provider, tone);

    return NextResponse.json(
      {
        prompt,
        mode,
        provider,
        tone,
        rounds: mode === 'debate' ? rounds : 1,
        agents,
        steps,
        finalDecision,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Council request failed';
    return jsonError(message, 500);
  }
}
