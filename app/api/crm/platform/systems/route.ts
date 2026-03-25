import { readJson } from '@/src/crm/core/api';
import { spawn } from 'child_process';
import {
  jsonResponse,
  parseBoolean,
  parseLimit,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import {
  buildRolloutTasks,
  CUSTOMER_LIFECYCLE,
  listSystemModules,
  summarizeSystemCatalog,
  type LifecyclePhase,
  type ModuleStatus,
  type RolloutScope,
} from '@/src/crm/modules/platform';
import { appendTaskDrafts } from '@/src/cto/taskQueue';
import { requireOperatorAccess } from '@/src/security/operatorAuth';

export const runtime = 'nodejs';

type BuildPlanBody = {
  scope?: unknown;
  limit?: unknown;
  enqueueToCto?: unknown;
  executeNow?: unknown;
  maxExecutions?: unknown;
};

type CtoExecutionResult = {
  status: 'idle' | 'completed' | 'error';
  message?: string;
  duration_ms?: number;
  task?: unknown;
  error?: string;
  traceback?: string;
};

const CTO_RUN_TIMEOUT_MS = 120_000;

function parseLastJsonLine(output: string): CtoExecutionResult | null {
  const lines = output.trim().split(/\r?\n/).reverse();
  for (const line of lines) {
    try {
      return JSON.parse(line) as CtoExecutionResult;
    } catch {
      continue;
    }
  }
  return null;
}

async function runCtoTaskOnce(): Promise<CtoExecutionResult> {
  return new Promise<CtoExecutionResult>((resolve) => {
    const child = spawn('python', ['-m', 'engine.run_cto_once'], { cwd: process.cwd() });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const settle = (result: CtoExecutionResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      settle({
        status: 'error',
        error: `CTO run timed out after ${CTO_RUN_TIMEOUT_MS / 1000}s`,
      });
    }, CTO_RUN_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      const parsed = parseLastJsonLine(stdout);
      if (parsed) {
        settle(parsed);
        return;
      }

      settle({
        status: 'error',
        error: stderr.trim() || stdout.trim() || `CTO runner exited with code ${String(code ?? 'unknown')}`,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      settle({
        status: 'error',
        error: error.message,
      });
    });
  });
}

function parsePhase(value?: string): LifecyclePhase | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return CUSTOMER_LIFECYCLE.includes(normalized as LifecyclePhase)
    ? (normalized as LifecyclePhase)
    : undefined;
}

function parseStatus(value?: string): ModuleStatus | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'live' || normalized === 'v1' || normalized === 'planned') {
    return normalized;
  }
  return undefined;
}

function parseScope(value?: string): RolloutScope {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'missing';

  const namedScopes: RolloutScope[] = [
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

  return namedScopes.includes(normalized as RolloutScope)
    ? (normalized as RolloutScope)
    : 'missing';
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const url = new URL(request.url);
    const phase = parsePhase(url.searchParams.get('phase') || undefined);
    const status = parseStatus(url.searchParams.get('status') || undefined);
    const domain = parseOptionalString(url.searchParams.get('domain'));
    const search = parseOptionalString(url.searchParams.get('search'));
    const limit = parseLimit(request, 120, 1, 300);

    const modules = listSystemModules({
      phase,
      status,
      domain,
      search,
      limit,
    });

    const summary = summarizeSystemCatalog(modules);

    return jsonResponse({
      lifecycle: CUSTOMER_LIFECYCLE,
      summary,
      modules,
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireOperatorAccess(request, { adminOnly: false });

    const body = await readJson<BuildPlanBody>(request);
    const scope = parseScope(parseOptionalString(body.scope));
    const limitRaw = Number(body.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(Math.floor(limitRaw), 150)) : 40;
    const enqueueToCto = parseBoolean(body.enqueueToCto, false);
    const executeNow = parseBoolean(body.executeNow, false);
    const maxExecutionsRaw = Number(body.maxExecutions);
    const maxExecutions = Number.isFinite(maxExecutionsRaw)
      ? Math.max(1, Math.min(Math.floor(maxExecutionsRaw), 10))
      : 3;

    const rolloutPlan = buildRolloutTasks({ scope, limit });

    let queueResult: { added: number; total: number } | undefined;
    if (enqueueToCto || executeNow) {
      await requireOperatorAccess(request, { adminOnly: true });
    }

    if (enqueueToCto) {
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
          idPrefix: 'rollout',
        }
      );

      queueResult = {
        added: appendResult.added.length,
        total: appendResult.total,
      };
    }

    let executions: {
      requested: number;
      completed: number;
      idle: number;
      failed: number;
      results: CtoExecutionResult[];
    } | undefined;

    if (executeNow) {
      const results: CtoExecutionResult[] = [];
      let completed = 0;
      let idle = 0;
      let failed = 0;

      for (let i = 0; i < maxExecutions; i += 1) {
        const result = await runCtoTaskOnce();
        results.push(result);

        if (result.status === 'completed') {
          completed += 1;
          continue;
        }

        if (result.status === 'idle') {
          idle += 1;
          break;
        }

        failed += 1;
        break;
      }

      executions = {
        requested: maxExecutions,
        completed,
        idle,
        failed,
        results,
      };
    }

    return jsonResponse(
      {
        rolloutPlan,
        queue: queueResult,
        executions,
      },
      201
    );
  });
}
