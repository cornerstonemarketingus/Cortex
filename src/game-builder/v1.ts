import { gameBuilderTracks, type GameBuilderTrackId } from '@/lib/builder-intelligence';

export type GameBuilderMonetization = 'free-to-play' | 'premium' | 'hybrid';

export type GameBuilderRequest = {
  projectName: string;
  track: GameBuilderTrackId;
  genre: string;
  audience: string;
  coreLoop: string;
  monetization: GameBuilderMonetization;
  aiFeatures: string[];
  includeMarketplacePack: boolean;
  includeLiveOps: boolean;
};

export type GameBuilderMilestone = {
  title: string;
  objective: string;
  deliverables: string[];
  qualityGates: string[];
};

export type GameBuilderPlan = {
  buildId: string;
  createdAt: string;
  request: GameBuilderRequest;
  trackSummary: {
    id: GameBuilderTrackId;
    name: string;
    description: string;
    defaultGoals: string[];
  };
  architecture: {
    gameplaySystems: string[];
    aiSystems: string[];
    telemetry: string[];
    marketplace: string[];
  };
  milestones: GameBuilderMilestone[];
  ctoTaskDrafts: Array<{
    type: 'feature';
    description: string;
    metadata: Record<string, unknown>;
  }>;
};

const defaultAiFeatures = [
  'npc-behavior-coach',
  'economy-balance-assistant',
  'quest-generation-engine',
  'player-retention-analytics',
];

function createBuildId(projectName: string) {
  const base = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const token = Math.random().toString(36).slice(2, 8);
  return `${base || 'game'}-${token}`;
}

function buildMilestones(input: GameBuilderRequest): GameBuilderMilestone[] {
  const foundationMilestone: GameBuilderMilestone = {
    title: 'Milestone 1: Product and Technical Blueprint',
    objective: 'Lock core loop, audience targeting, and architecture boundaries before code generation.',
    deliverables: [
      `Define ${input.genre} game thesis for ${input.audience}`,
      `Document core loop: ${input.coreLoop}`,
      'Produce economy and progression assumptions',
      'Define event telemetry and analytics schema',
    ],
    qualityGates: [
      'Gameplay loop documented with measurable success events',
      'Technical architecture approved for scalability',
    ],
  };

  const buildMilestone: GameBuilderMilestone = {
    title: 'Milestone 2: Core Systems and Prototype',
    objective: 'Generate playable core systems and instrument AI-assisted balancing workflows.',
    deliverables: [
      'Implement gameplay state machine and interaction systems',
      'Ship inventory, progression, and reward loops',
      'Wire AI tuning hooks for retention and balance checks',
      'Add first-party telemetry for gameplay events',
    ],
    qualityGates: [
      'Core loop playable end-to-end',
      'Telemetry events emitted and validated',
      'No critical defects in core interactions',
    ],
  };

  const growthMilestone: GameBuilderMilestone = {
    title: 'Milestone 3: Growth, Monetization, and Marketplace',
    objective: 'Launch monetization, creator packaging, and marketplace distribution readiness.',
    deliverables: [
      `Implement ${input.monetization} monetization model`,
      'Prepare reusable asset/module packages',
      'Generate creator documentation and release notes',
      'Define live-ops playbook and update cadence',
    ],
    qualityGates: [
      'Monetization flow passes QA without blocking issues',
      'Marketplace package has versioning and compatibility notes',
      'Live-ops dashboards and runbooks are available',
    ],
  };

  return input.includeLiveOps
    ? [foundationMilestone, buildMilestone, growthMilestone]
    : [foundationMilestone, buildMilestone];
}

function buildArchitecture(input: GameBuilderRequest) {
  const gameplaySystems = [
    'session orchestration',
    'progression and rewards',
    'match rules and balancing',
  ];

  const aiSystems = input.aiFeatures.length > 0
    ? input.aiFeatures
    : defaultAiFeatures;

  const telemetry = [
    'event ingestion for gameplay and economy actions',
    'retention funnels (D1, D7, D30)',
    'anomaly alerts for progression and drop-off points',
  ];

  const marketplace = input.includeMarketplacePack
    ? [
        'versioned module packaging',
        'creator-facing documentation',
        'publish and rollback workflow',
      ]
    : ['marketplace packaging deferred'];

  return {
    gameplaySystems,
    aiSystems,
    telemetry,
    marketplace,
  };
}

function buildTaskDrafts(input: GameBuilderRequest, buildId: string) {
  const baseMetadata = {
    buildId,
    track: input.track,
    projectName: input.projectName,
    audience: input.audience,
  };

  const tasks = [
    {
      type: 'feature' as const,
      description: `[GameBuilder V1] Scaffold ${input.projectName} core loop and progression systems (${input.track}).`,
      metadata: {
        ...baseMetadata,
        lane: 'core-systems',
      },
    },
    {
      type: 'feature' as const,
      description: `[GameBuilder V1] Implement AI balancing and retention telemetry for ${input.projectName}.`,
      metadata: {
        ...baseMetadata,
        lane: 'ai-telemetry',
      },
    },
  ];

  if (input.includeMarketplacePack) {
    tasks.push({
      type: 'feature' as const,
      description: `[GameBuilder V1] Package ${input.projectName} for marketplace release with versioning and docs.`,
      metadata: {
        ...baseMetadata,
        lane: 'marketplace',
      },
    });
  }

  return tasks;
}

export function listGameBuilderTracks() {
  return gameBuilderTracks;
}

export function createGameBuilderPlan(input: GameBuilderRequest): GameBuilderPlan {
  const track = gameBuilderTracks.find((item) => item.id === input.track) || gameBuilderTracks[0];
  const buildId = createBuildId(input.projectName);

  return {
    buildId,
    createdAt: new Date().toISOString(),
    request: input,
    trackSummary: {
      id: track.id,
      name: track.name,
      description: track.description,
      defaultGoals: track.defaultGoals,
    },
    architecture: buildArchitecture(input),
    milestones: buildMilestones(input),
    ctoTaskDrafts: buildTaskDrafts(input, buildId),
  };
}
