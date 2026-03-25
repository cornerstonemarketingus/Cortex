import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { evaluateAutonomousGuardrails } from '@/src/security/autonomousGuardrails';

type AgentMode = 'propose' | 'apply';
type AgentRequest = {
  agentType: string;
  task: string;
  mode?: AgentMode;
  dryRun?: boolean;
  rollbackPlan?: string;
};
type AgentRunnerResponse = {
  agent: string;
  status: 'success' | 'error';
  result: string;
  duration_ms?: number;
  mode?: string;
  dry_run?: boolean;
};

const VALID_AGENT_TYPES = new Set([
  'code', 'doc', 'test', 'data', 'nlp', 'content',
  'seo', 'analytics', 'planning', 'repair', 'infra',
  'deploy', 'monitor', 'ops', 'rl',
]);
const VALID_MODES = new Set<AgentMode>(['propose', 'apply']);
const DEFAULT_HUMAN_TOKEN = 'HUMAN-TOKEN-EXAMPLE';

const PROMPT_MAX_CHARS = 8_000;
const PROCESS_TIMEOUT_MS = 30_000;

// ── Simple in-memory rate limiter (10 req / 60 s per IP) ─────────────────────
// For multi-instance / production deployments, replace with a Redis-backed store.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const _rlMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  // Prune old entries to avoid unbounded memory growth.
  for (const [key, value] of _rlMap.entries()) {
    if (now > value.resetAt) _rlMap.delete(key);
  }
  const entry = _rlMap.get(ip);
  if (!entry || now > entry.resetAt) {
    _rlMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

// ── Python agent subprocess ───────────────────────────────────────────────────
function runPythonAgent(
  agentType: string,
  task: string,
  mode: AgentMode,
  dryRun: boolean,
): Promise<AgentRunnerResponse> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'engine', 'run_agent.py');
    const args = [
      scriptPath,
      '--agent', agentType,
      '--task', task,
      '--mode', mode,
      dryRun ? '--dry-run' : '--no-dry-run',
    ];
    // spawn (not exec) — args are passed as array, never interpolated into a shell
    const child = spawn('python', args, {
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    // Hard process timeout
    const timer = setTimeout(() => {
      console.error(`[agents] terminating ${agentType}: timeout after ${PROCESS_TIMEOUT_MS}ms`);
      child.kill('SIGTERM');
      reject(new Error(`Agent timed out after ${PROCESS_TIMEOUT_MS / 1000}s`));
    }, PROCESS_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Process exited with code ${code}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        // Surface Python-level errors as rejections so the caller handles them uniformly
        if (parsed.status === 'error') {
          reject(new Error(parsed.result ?? 'Agent returned error status'));
          return;
        }
        resolve(parsed as AgentRunnerResponse);
      } catch {
        resolve({
          agent: agentType,
          status: 'success',
          result: stdout.trim(),
          mode,
          dry_run: dryRun,
        });
      }
    });

    child.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

// ── Route handlers ───────────────────────────────────────────────────────────

/** GET /api/agents — list available agent types */
export async function GET() {
  const t0 = Date.now();
  return NextResponse.json({
    agents: Array.from(VALID_AGENT_TYPES).map((id) => ({ id, name: id })),
  }, {
    headers: {
      'X-Response-Time': `${Date.now() - t0}ms`,
    },
  });
}

/** POST /api/agents — run an agent */
export async function POST(request: Request) {
  const t0 = Date.now();

  // Rate limiting — use X-Forwarded-For header (set by reverse proxy) or fall back
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
    );
  }

  let body: AgentRequest;
  try {
    body = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.agentType || !body.task) {
    return NextResponse.json(
      { error: 'Missing required fields: agentType, task' },
      { status: 400 }
    );
  }

  if (!VALID_AGENT_TYPES.has(body.agentType)) {
    return NextResponse.json(
      { error: `Unknown agent type: ${body.agentType}` },
      { status: 400 }
    );
  }

  if (typeof body.task !== 'string' || body.task.trim().length === 0) {
    return NextResponse.json({ error: 'task must be a non-empty string' }, { status: 400 });
  }

  const mode: AgentMode = (body.mode ?? 'propose');
  if (!VALID_MODES.has(mode)) {
    return NextResponse.json({ error: `Invalid mode: ${String(body.mode)}` }, { status: 400 });
  }

  // Safe default: always dry-run unless explicitly disabled.
  const dryRun = body.dryRun !== false;
  const rollbackPlan = typeof body.rollbackPlan === 'string' ? body.rollbackPlan.trim() : undefined;

  // Real apply execution requires explicit human token approval.
  const providedToken = request.headers.get('x-human-token');
  const configuredToken = process.env.HUMAN_TOKEN ?? DEFAULT_HUMAN_TOKEN;
  if (mode === 'apply' && !dryRun) {
    if (providedToken !== configuredToken) {
      return NextResponse.json(
        { error: 'Human approval required for apply mode (missing or invalid X-Human-Token)' },
        { status: 403 },
      );
    }
  }

  const guardrailDecision = evaluateAutonomousGuardrails({
    mode,
    dryRun,
    task: body.task,
    rollbackPlan,
  });

  if (!guardrailDecision.allowed) {
    return NextResponse.json(
      {
        error: 'Autonomous guardrail policy blocked this execution request',
        guardrails: guardrailDecision,
      },
      { status: 422 }
    );
  }

  // Enforce prompt size on the API boundary (Python also enforces internally)
  const task = body.task.length > PROMPT_MAX_CHARS
    ? body.task.slice(0, PROMPT_MAX_CHARS)
    : body.task;

  try {
    const output = await runPythonAgent(body.agentType, task, mode, dryRun);
    const durationMs = Date.now() - t0;
    return NextResponse.json(
      {
        agent: output.agent,
        status: output.status,
        result: output.result,
        duration_ms: output.duration_ms ?? durationMs,
        mode: output.mode ?? mode,
        dry_run: output.dry_run ?? dryRun,
        guardrails: guardrailDecision,
      },
      {
        headers: {
          'X-Response-Time': `${durationMs}ms`,
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      }
    );
  } catch (err) {
    const durationMs = Date.now() - t0;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[agents] ${body.agentType} failed in ${durationMs}ms:`, message);
    return NextResponse.json(
      { error: 'Agent execution failed', detail: message },
      { status: 500, headers: { 'X-Response-Time': `${durationMs}ms` } }
    );
  }
}


