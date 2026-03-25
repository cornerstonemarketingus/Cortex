export type BuilderBlueprintId = "website" | "app" | "business" | "game";

export type BuilderBlueprint = {
  id: BuilderBlueprintId;
  name: string;
  description: string;
  objective: string;
  ctoTaskDescription: string;
  suggestedCommands: string[];
  outcomes: string[];
};

export type BuilderPlaybook = {
  id: string;
  name: string;
  description: string;
  commands: string[];
};

export type AiOptimizationId =
  | "multi-agent-consensus"
  | "retrieval-context"
  | "guardrails"
  | "self-critique"
  | "psychographic-copy"
  | "market-signal-learning";

export type AiOptimizationOption = {
  id: AiOptimizationId;
  label: string;
  description: string;
  defaultEnabled: boolean;
};

export type BusinessBuilderFeature = {
  id: string;
  name: string;
  description: string;
  valueImpact: string;
};

export type GameBuilderTrackId = "roblox" | "cross-platform" | "marketplace";

export type GameBuilderTrack = {
  id: GameBuilderTrackId;
  name: string;
  description: string;
  defaultGoals: string[];
};

export const requiredBuilderBlueprintIds: BuilderBlueprintId[] = [
  "website",
  "app",
  "business",
  "game",
];

export const builderPlaybooks: BuilderPlaybook[] = [
  {
    id: "diagnostics",
    name: "Diagnostics Sweep",
    description: "Quick sanity checks for Git state, runtime readiness, and lint health.",
    commands: ["git status", "python --version", "npm run lint"],
  },
  {
    id: "quality-gate",
    name: "Quality Gate",
    description: "Run lint, targeted tests, and build validation for reliable releases.",
    commands: ["npm run lint", "python -m pytest tests/test_engine_checks.py", "npm run build"],
  },
  {
    id: "full-self-build",
    name: "Full Self-Build Pass",
    description: "End-to-end deep pass before apply mode operations.",
    commands: [
      "git status",
      "npm run lint",
      "python -m pytest tests/test_engine_checks.py",
      "npm run build",
    ],
  },
];

export const builderBlueprints: BuilderBlueprint[] = [
  {
    id: "website",
    name: "Website Builder",
    description: "Plan and execute a marketing site flow with landing pages, forms, and analytics hooks.",
    objective:
      "Build or improve the in-app website builder flow with reusable page sections, capture forms, and conversion tracking.",
    ctoTaskDescription:
      "Implement website builder capabilities: reusable sections, routing templates, lead forms, and analytics instrumentation.",
    suggestedCommands: [
      'python engine/run_agent.py --agent planning --task "Plan website builder architecture and milestones"',
      "npm run build",
    ],
    outcomes: [
      "Higher conversion-ready page velocity",
      "Reusable lead-capture templates",
      "Instrumentation for attribution and funnel drop-off",
    ],
  },
  {
    id: "app",
    name: "App Builder",
    description: "Plan and execute application module scaffolding with shared components and API contracts.",
    objective:
      "Build or improve the in-app app builder flow with module scaffolding, API contracts, and QA gates.",
    ctoTaskDescription:
      "Implement app builder capabilities: module scaffolding, API contracts, and deployment-ready quality checks.",
    suggestedCommands: [
      'python engine/run_agent.py --agent planning --task "Plan app builder architecture and milestones"',
      "npm run build",
    ],
    outcomes: [
      "Faster module delivery with fewer integration defects",
      "Repeatable API contract validation",
      "Better deployment confidence with quality gates",
    ],
  },
  {
    id: "business",
    name: "Business Builder (SEO + GEO)",
    description:
      "Plan and execute business growth loops with search visibility, local optimization, and conversion analytics.",
    objective:
      "Build or improve the business builder flow with SEO and GEO optimization automation, content loops, and conversion benchmarks.",
    ctoTaskDescription:
      "Implement business builder capabilities: SEO + GEO strategy automation, local search optimization workflows, and conversion instrumentation.",
    suggestedCommands: [
      'python engine/run_agent.py --agent planning --task "Plan SEO and GEO optimization architecture with measurable milestones"',
      "npm run build",
    ],
    outcomes: [
      "Compounding organic traffic from search and local intent",
      "Stronger answer-engine visibility for AI-assisted discovery",
      "Actionable conversion analytics tied to campaign decisions",
    ],
  },
  {
    id: "game",
    name: "Game Builder Engine",
    description:
      "Plan and execute game production pipelines for Roblox and other game ecosystems with reusable modules.",
    objective:
      "Build or improve the game builder flow with Roblox-friendly project scaffolds, reusable gameplay modules, and marketplace packaging.",
    ctoTaskDescription:
      "Implement game builder capabilities: Roblox and multi-game scaffolding, reusable gameplay assets, and marketplace-ready packaging workflows.",
    suggestedCommands: [
      'python engine/run_agent.py --agent planning --task "Plan game builder architecture for Roblox and cross-platform workflows"',
      "npm run build",
    ],
    outcomes: [
      "Reusable gameplay systems for faster prototyping",
      "Marketplace-ready packages and versioned assets",
      "Clear monetization and live-ops planning loops",
    ],
  },
];

export const aiOptimizationOptions: AiOptimizationOption[] = [
  {
    id: "multi-agent-consensus",
    label: "Multi-agent consensus",
    description: "Use planner, critic, and implementer passes before action.",
    defaultEnabled: true,
  },
  {
    id: "retrieval-context",
    label: "Retrieval-augmented context",
    description: "Inject historical project context and verified docs into prompts.",
    defaultEnabled: true,
  },
  {
    id: "guardrails",
    label: "Safety and policy guardrails",
    description: "Apply execution constraints, approval checks, and scope boundaries.",
    defaultEnabled: true,
  },
  {
    id: "self-critique",
    label: "Self-critique and revision loop",
    description: "Run critique and revision before execution for lower defect risk.",
    defaultEnabled: true,
  },
  {
    id: "psychographic-copy",
    label: "Psychographic messaging optimization",
    description: "Tune messaging for audience motivation and trust signals.",
    defaultEnabled: true,
  },
  {
    id: "market-signal-learning",
    label: "Market signal learning",
    description: "Continuously adjust based on campaign and conversion telemetry.",
    defaultEnabled: false,
  },
];

export const businessBuilderFeatures: BusinessBuilderFeature[] = [
  {
    id: "geo-answer-optimization",
    name: "GEO Answer Optimization",
    description: "Structure site and content to rank in AI answer experiences and zero-click contexts.",
    valueImpact: "Increases discoverability in conversational and answer-driven channels.",
  },
  {
    id: "local-intent-maps",
    name: "Local Intent Maps",
    description: "Map geo-intent clusters by city/region and route them to targeted pages and offers.",
    valueImpact: "Improves conversion quality for local and regional demand.",
  },
  {
    id: "offer-testing",
    name: "Offer and Pricing Experiments",
    description: "A/B test offer framing, bundles, and social proof to improve close rates.",
    valueImpact: "Raises sales efficiency and lowers acquisition payback period.",
  },
  {
    id: "funnel-psychology",
    name: "Funnel Psychology Engine",
    description: "Use communication and psychology patterns for trust, urgency, and clarity at each stage.",
    valueImpact: "Increases lead-to-opportunity and opportunity-to-close rates.",
  },
  {
    id: "reputation-loop",
    name: "Reputation Flywheel",
    description: "Automate review requests, response drafts, and social proof publishing loops.",
    valueImpact: "Boosts authority signals and customer confidence.",
  },
  {
    id: "exec-scorecards",
    name: "Executive Scorecards",
    description: "Summarize growth KPIs by channel, segment, and campaign confidence.",
    valueImpact: "Improves strategic decision quality and speed.",
  },
];

export const gameBuilderTracks: GameBuilderTrack[] = [
  {
    id: "roblox",
    name: "Roblox Fast-Track",
    description: "Focus on Roblox-ready modular gameplay systems and creator economics.",
    defaultGoals: [
      "Generate core gameplay loop scaffold",
      "Define progression and reward systems",
      "Package reusable marketplace assets",
    ],
  },
  {
    id: "cross-platform",
    name: "Cross-Platform Prototype",
    description: "Design engine-agnostic systems for PC, mobile, and web experiences.",
    defaultGoals: [
      "Design shared gameplay architecture",
      "Create content pipeline and balancing loop",
      "Define telemetry hooks for live tuning",
    ],
  },
  {
    id: "marketplace",
    name: "Marketplace Publishing",
    description: "Package modules, templates, and monetization plans for marketplace readiness.",
    defaultGoals: [
      "Define SKU-style module packaging",
      "Create creator-facing documentation",
      "Set pricing and update cadence strategy",
    ],
  },
];
