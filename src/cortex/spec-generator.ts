import { generateBuilderConciergeResponse } from '@/src/builder/concierge';

export type SpecGeneratorAction = 'preview' | 'approve' | 'modify' | 'deploy';

export type SpecGeneratorInput = {
  prompt: string;
  action: SpecGeneratorAction;
  modificationNotes?: string;
};

export type FeatureSpec = {
  featureRequest: string;
  action: SpecGeneratorAction;
  schema: {
    models: Array<{
      name: string;
      fields: string[];
      relations?: string[];
    }>;
    notes: string[];
  };
  api: Array<{
    route: string;
    method: string;
    purpose: string;
  }>;
  ui: Array<{
    area: string;
    components: string[];
    behavior: string[];
  }>;
  workflows: Array<{
    name: string;
    trigger: string;
    steps: string[];
  }>;
  codeGeneratorLayer: {
    prisma: string[];
    apiRoutes: string[];
    reactComponents: string[];
    qualityChecks: string[];
  };
  sandboxExecution: {
    environment: string;
    validationChecks: string[];
    passCriteria: string[];
  };
  applyPlan: {
    mergeStrategy: string[];
    reloadSteps: string[];
  };
  memoryPlan: {
    featuresBuilt: string[];
    patternsUsed: string[];
    reusableComponents: string[];
  };
  buildCortexDashboard: {
    inputPromptExample: string;
    outputPanels: string[];
    actions: Array<'Approve' | 'Modify' | 'Deploy'>;
  };
  priorityStack: {
    phase1: string[];
    phase2: string[];
    phase3: string[];
  };
  safeguards: string[];
  suggestedCtoTasks: string[];
};

function makeModelName(featureRequest: string): string {
  const token = featureRequest
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .find((item) => item.length > 4);

  const fallback = token || 'Feature';
  return `${fallback.charAt(0).toUpperCase()}${fallback.slice(1)}Program`;
}

function buildSchema(featureRequest: string) {
  const modelName = makeModelName(featureRequest);

  return {
    models: [
      {
        name: modelName,
        fields: [
          'id String @id @default(cuid())',
          'name String',
          'status String @default("active")',
          'rulesJson Json',
          'createdAt DateTime @default(now())',
          'updatedAt DateTime @updatedAt',
        ],
      },
      {
        name: `${modelName}Enrollment`,
        fields: [
          'id String @id @default(cuid())',
          'programId String',
          'leadId String',
          'points Int @default(0)',
          'tier String @default("starter")',
          'createdAt DateTime @default(now())',
        ],
        relations: ['program -> Program', 'lead -> Lead'],
      },
      {
        name: `${modelName}Event`,
        fields: [
          'id String @id @default(cuid())',
          'programId String',
          'enrollmentId String',
          'eventType String',
          'value Int',
          'metadata Json?',
          'createdAt DateTime @default(now())',
        ],
      },
    ],
    notes: [
      'Use additive migrations only. Never drop existing production columns in autonomous mode.',
      'Backfill scripts should be idempotent and checkpointed.',
    ],
  };
}

function buildApi(featureSlug: string) {
  return [
    {
      route: `/api/crm/retain/${featureSlug}/programs`,
      method: 'GET/POST',
      purpose: 'List and create program definitions.',
    },
    {
      route: `/api/crm/retain/${featureSlug}/enrollments`,
      method: 'GET/POST',
      purpose: 'Enroll leads and fetch participant states.',
    },
    {
      route: `/api/crm/retain/${featureSlug}/events`,
      method: 'POST',
      purpose: 'Track reward and behavior events.',
    },
    {
      route: `/api/crm/retain/${featureSlug}/redeem`,
      method: 'POST',
      purpose: 'Redeem rewards with validation rules.',
    },
  ];
}

function buildUi(featureRequest: string) {
  return [
    {
      area: 'Admin / Build Cortex',
      components: ['FeatureRequestInput', 'SpecPreviewPanel', 'DeployControls'],
      behavior: ['Generate spec draft', 'Show schema/api/ui/workflow diffs', 'Approve, modify, or deploy'],
    },
    {
      area: 'CRM Retention',
      components: ['ProgramList', 'EnrollmentTable', 'RewardRulesEditor'],
      behavior: ['Create and manage programs', 'Track points/tiers', 'Launch reward campaigns'],
    },
    {
      area: 'Lead Profile',
      components: ['RewardsBadge', 'MilestoneTimeline'],
      behavior: ['Display progress', 'Show next milestone incentives'],
    },
    {
      area: 'Home Builder Assistant',
      components: ['ConciergeChat', 'IdeaToPlanPanel'],
      behavior: ['Turn idea into implementation plan', 'Route lead into domain + onboarding flow'],
    },
  ];
}

function buildWorkflows(featureRequest: string) {
  return [
    {
      name: 'On Enrollment Created',
      trigger: 'Lead enters program',
      steps: [
        'Send welcome SMS/email with current tier and reward ladder.',
        'Create follow-up task in nurture queue.',
        'Tag lead for campaign segmentation.',
      ],
    },
    {
      name: 'On Milestone Reached',
      trigger: 'Points or action threshold met',
      steps: [
        'Issue reward token and update tier.',
        'Notify sales and success teams.',
        'Trigger referral ask flow with incentive copy.',
      ],
    },
    {
      name: 'Weekly Optimization Loop',
      trigger: 'Scheduled cron',
      steps: [
        'Evaluate campaign conversion and redemption rates.',
        'Propose program rule optimizations.',
        'Queue bugfix or experiment tasks into CTO backlog.',
      ],
    },
  ];
}

function buildSlug(featureRequest: string): string {
  const fallback = 'feature';
  const slug = featureRequest
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);

  return slug || fallback;
}

export function generateFeatureSpec(input: SpecGeneratorInput): FeatureSpec {
  const prompt = input.prompt.trim();
  const featureRequest = input.modificationNotes?.trim()
    ? `${prompt}\n\nModification notes: ${input.modificationNotes.trim()}`
    : prompt;

  const slug = buildSlug(prompt);
  const concierge = generateBuilderConciergeResponse({
    message: prompt,
    mode: 'operator',
    includeDomainSales: true,
    includeAutonomousIdeas: true,
  });

  return {
    featureRequest,
    action: input.action,
    schema: buildSchema(prompt),
    api: buildApi(slug),
    ui: buildUi(prompt),
    workflows: buildWorkflows(prompt),
    codeGeneratorLayer: {
      prisma: [
        'Generate or extend Prisma model blocks for program/enrollment/event.',
        'Create migration file with additive schema changes only.',
      ],
      apiRoutes: [
        'Generate route handlers with strict validation and auth guardrails.',
        'Create service module for business logic and queue integration.',
      ],
      reactComponents: [
        'Generate typed dashboard components with loading/error states.',
        'Generate forms with validation and optimistic UI updates.',
      ],
      qualityChecks: [
        'Run lint and typecheck on generated artifacts.',
        'Run targeted tests for route validation and state reducers.',
        'Run full production build before apply.',
      ],
    },
    sandboxExecution: {
      environment: 'Isolated workspace clone with dry-run apply simulation.',
      validationChecks: [
        'No breaking changes against existing route contracts.',
        'Prisma schema integrity and migration parse checks.',
        'Compile, lint, and smoke endpoint verification.',
      ],
      passCriteria: [
        'Build succeeds',
        'No critical regression errors',
        'Generated routes pass validation tests',
      ],
    },
    applyPlan: {
      mergeStrategy: [
        'Open patch preview for operator review.',
        'Approve and apply only scoped changes.',
        'Queue post-deploy verification checklist.',
      ],
      reloadSteps: [
        'Refresh route registry and UI module map.',
        'Invalidate stale cache for updated pages.',
        'Run one CTO task cycle for follow-up cleanup tasks.',
      ],
    },
    memoryPlan: {
      featuresBuilt: [
        `Feature spec generated for: ${prompt}`,
        'Tracked schema/API/UI/workflow bundle generated via Build Cortex.',
      ],
      patternsUsed: [
        'Spec -> codegen -> sandbox -> deploy pipeline',
        'Guardrailed apply flow with human approval gating',
        'Autonomous optimization backlog loop',
      ],
      reusableComponents: [
        'SpecPreviewPanel',
        'DeployControls',
        'Builder concierge prompt packs',
      ],
    },
    buildCortexDashboard: {
      inputPromptExample: 'Create a referral rewards system for cleaning businesses',
      outputPanels: ['Preview UI', 'Schema Changes', 'Workflow Graph', 'Deploy Notes'],
      actions: ['Approve', 'Modify', 'Deploy'],
    },
    priorityStack: {
      phase1: ['Unified orchestrator', 'Role-selector removal', 'Single control-layer workflow'],
      phase2: ['Self-building agent loop', 'Growth optimization engine'],
      phase3: ['Template marketplace', 'Vertical packs', 'Data flywheel', 'AI deal closer'],
    },
    safeguards: [
      'Default execution mode remains propose + dry-run.',
      'Apply mode requires explicit human approval token.',
      'Destructive operations are blocked by policy.',
      'Every deploy candidate must pass lint/build checks before merge.',
    ],
    suggestedCtoTasks: [
      ...concierge.autonomousGrowthSuggestions,
      'Implement Build Cortex dashboard tab and preview panes.',
      'Wire conversion tracking for hero variants and CTA events.',
      'Publish weekly autonomous blog and lead-gen content experiments.',
    ],
  };
}
