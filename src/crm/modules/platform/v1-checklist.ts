import {
  CRM_SYSTEM_CATALOG,
  type CrmSystemModule,
  type LifecyclePhase,
  type ModuleStatus,
} from './system-catalog';

export type ChecklistScope = 'all' | 'builder' | 'crm';

type OptimizationState = 'optimized' | 'needs-optimization' | 'not-live';

type SequentialStepStatus = 'queued' | 'in-progress' | 'complete';

export type V1ChecklistItem = {
  id: string;
  name: string;
  phase: LifecyclePhase;
  status: ModuleStatus;
  domains: string[];
  optimizationScore: number;
  optimizationState: OptimizationState;
  why: string;
  nextAction: string;
};

export type V1ChecklistSummary = {
  total: number;
  live: number;
  v1: number;
  planned: number;
  optimizedLive: number;
  liveNeedingOptimization: number;
};

export type SequentialBuildStep = {
  order: number;
  title: string;
  status: SequentialStepStatus;
  remaining: number;
  goal: string;
};

export type V1Checklist = {
  scope: ChecklistScope;
  summary: V1ChecklistSummary;
  sequentialBuild: SequentialBuildStep[];
  v1InProgress: V1ChecklistItem[];
  plannedBacklog: V1ChecklistItem[];
  optimization: {
    optimized: V1ChecklistItem[];
    needsWork: V1ChecklistItem[];
  };
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function inScope(module: CrmSystemModule, scope: ChecklistScope): boolean {
  if (scope === 'all') return true;

  if (scope === 'builder') {
    return module.domains.some((domain) => ['builder', 'web', 'app', 'game', 'marketplace'].includes(normalize(domain)));
  }

  return !module.domains.some((domain) => ['builder', 'marketplace', 'game'].includes(normalize(domain)));
}

function scoreOptimization(module: CrmSystemModule): number {
  const aiDepthScore = Math.min(module.aiAdvancements.length, 4) * 14;
  const routeCoverageScore = Math.min(module.existingRoutes.length, 3) * 12;
  const statusScore = module.status === 'live' ? 16 : module.status === 'v1' ? 8 : 0;
  const domainDepthScore = Math.min(module.domains.length, 3) * 4;

  return Math.min(100, aiDepthScore + routeCoverageScore + statusScore + domainDepthScore);
}

function optimizationState(module: CrmSystemModule, score: number): OptimizationState {
  if (module.status !== 'live') return 'not-live';
  return score >= 70 ? 'optimized' : 'needs-optimization';
}

function buildWhy(module: CrmSystemModule, state: OptimizationState): string {
  if (state === 'optimized') {
    return 'Live with strong AI depth and route coverage.';
  }

  if (state === 'needs-optimization') {
    return 'Live but missing optimization depth in AI coverage and/or route surface.';
  }

  if (module.status === 'v1') {
    return 'Functional V1 exists; completion and hardening still required.';
  }

  return 'Planned module not yet promoted to V1.';
}

function buildNextAction(module: CrmSystemModule, state: OptimizationState): string {
  if (state === 'optimized') {
    return 'Maintain with monitoring, regression tests, and KPI guardrails.';
  }

  if (state === 'needs-optimization') {
    return 'Add performance instrumentation, fallback paths, and deeper AI automation loops.';
  }

  if (module.status === 'v1') {
    return 'Close V1 acceptance gaps and promote to live readiness gate.';
  }

  return 'Scope MVP, create endpoints/workflows, then progress to V1.';
}

function toItem(module: CrmSystemModule): V1ChecklistItem {
  const score = scoreOptimization(module);
  const state = optimizationState(module, score);

  return {
    id: module.id,
    name: module.name,
    phase: module.phase,
    status: module.status,
    domains: module.domains,
    optimizationScore: score,
    optimizationState: state,
    why: buildWhy(module, state),
    nextAction: buildNextAction(module, state),
  };
}

function byOptimizationScoreDesc(a: V1ChecklistItem, b: V1ChecklistItem): number {
  return b.optimizationScore - a.optimizationScore;
}

function byPriority(a: V1ChecklistItem, b: V1ChecklistItem): number {
  const statusOrder: Record<ModuleStatus, number> = {
    v1: 0,
    planned: 1,
    live: 2,
  };

  if (statusOrder[a.status] !== statusOrder[b.status]) {
    return statusOrder[a.status] - statusOrder[b.status];
  }

  return a.name.localeCompare(b.name);
}

function buildSequentialSteps(summary: V1ChecklistSummary): SequentialBuildStep[] {
  const step1Complete = summary.v1 === 0;
  const step2Complete = summary.liveNeedingOptimization === 0;
  const step3Complete = summary.planned === 0;

  const step1Status: SequentialStepStatus = step1Complete ? 'complete' : 'in-progress';
  const step2Status: SequentialStepStatus = !step1Complete ? 'queued' : step2Complete ? 'complete' : 'in-progress';
  const step3Status: SequentialStepStatus = !step1Complete || !step2Complete ? 'queued' : step3Complete ? 'complete' : 'in-progress';

  return [
    {
      order: 1,
      title: 'Complete V1 Modules',
      status: step1Status,
      remaining: summary.v1,
      goal: 'Promote all in-progress V1 modules to live quality and reliability standards.',
    },
    {
      order: 2,
      title: 'Optimize Live Modules',
      status: step2Status,
      remaining: summary.liveNeedingOptimization,
      goal: 'Raise optimization depth for live modules: performance, resilience, and automation coverage.',
    },
    {
      order: 3,
      title: 'Promote Planned Backlog',
      status: step3Status,
      remaining: summary.planned,
      goal: 'Convert planned modules to V1 scope and move through the same quality gates.',
    },
  ];
}

export function buildV1CompletionChecklist(scope: ChecklistScope = 'all'): V1Checklist {
  const modules = CRM_SYSTEM_CATALOG.filter((module) => inScope(module, scope));
  const items = modules.map(toItem);

  const summary: V1ChecklistSummary = {
    total: modules.length,
    live: items.filter((item) => item.status === 'live').length,
    v1: items.filter((item) => item.status === 'v1').length,
    planned: items.filter((item) => item.status === 'planned').length,
    optimizedLive: items.filter((item) => item.status === 'live' && item.optimizationState === 'optimized').length,
    liveNeedingOptimization: items.filter(
      (item) => item.status === 'live' && item.optimizationState === 'needs-optimization'
    ).length,
  };

  const v1InProgress = items
    .filter((item) => item.status === 'v1')
    .sort(byPriority);

  const plannedBacklog = items
    .filter((item) => item.status === 'planned')
    .sort(byPriority);

  const optimized = items
    .filter((item) => item.optimizationState === 'optimized')
    .sort(byOptimizationScoreDesc);

  const needsWork = items
    .filter((item) => item.optimizationState === 'needs-optimization')
    .sort((a, b) => a.optimizationScore - b.optimizationScore);

  return {
    scope,
    summary,
    sequentialBuild: buildSequentialSteps(summary),
    v1InProgress,
    plannedBacklog,
    optimization: {
      optimized,
      needsWork,
    },
  };
}
