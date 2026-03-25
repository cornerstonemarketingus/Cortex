type BlueprintType = 'website' | 'app' | 'business' | 'game';

type PlanStep = {
  phase: string;
  owner: string;
  tasks: string[];
};

type SalesSystem = {
  offer: string;
  funnelStages: string[];
  automationPrompts: string[];
  followUpCadence: string[];
  kpiTargets: string[];
};

type VoiceAgentPack = {
  persona: string;
  openingScript: string;
  qualificationQuestions: string[];
  objectionHandlers: string[];
  closeScript: string;
};

type CodeChangeSuggestion = {
  objective: string;
  agentType: 'planning' | 'code' | 'seo' | 'content';
  mode: 'propose' | 'apply';
  dryRunRecommended: boolean;
  taskPayload: string;
};

export type BuilderConciergeInput = {
  message: string;
  blueprint?: string;
  mode?: 'visitor' | 'operator';
  includeDomainSales?: boolean;
  includeAutonomousIdeas?: boolean;
};

export type BuilderConciergeOutput = {
  summary: string;
  detectedBlueprint: BlueprintType;
  implementationPlan: PlanStep[];
  websiteSections: string[];
  appModules: string[];
  salesSystem: SalesSystem;
  voiceAgent: VoiceAgentPack;
  domainSuggestions: string[];
  autonomousGrowthSuggestions: string[];
  codeChangeSuggestions: CodeChangeSuggestion[];
  nextActions: string[];
};

const WEBSITE_SECTION_LIBRARY: Record<BlueprintType, string[]> = {
  website: [
    'Hero with offer, proof, and strong CTA',
    'Problem -> outcome narrative section',
    'Offer stack and service packages',
    'Live demo or screenshot strip',
    'Pricing and ROI section',
    'FAQ and objection handling block',
    'Lead capture form with CRM routing',
  ],
  app: [
    'Product-led hero with onboarding CTA',
    'Use-case grid by role and workflow',
    'Feature walkthrough sequence',
    'Integrations and API trust section',
    'Pricing matrix and annual discount',
    'Customer stories and outcomes',
    'Interactive onboarding capture form',
  ],
  business: [
    'Pipeline growth hero',
    'How it works capture -> close -> retain',
    'Sales automation and AI ops section',
    'Proof metrics and benchmarks',
    'Pricing + calculator block',
    'Free audit lead form',
  ],
  game: [
    'Game concept hero and trailer CTA',
    'Core loop and progression explainer',
    'Community and social proof section',
    'Marketplace module previews',
    'Builder waitlist form',
  ],
};

const APP_MODULE_LIBRARY: Record<BlueprintType, string[]> = {
  website: [
    'CMS-like page section composer',
    'Lead intake forms with validation',
    'A/B hero and CTA testing controls',
    'SEO metadata and schema manager',
    'Conversation assistant widget',
  ],
  app: [
    'Workspace/project manager',
    'AI planning and prompt orchestration module',
    'Code generation and diff preview module',
    'Approvals + deploy control center',
    'Analytics and experimentation dashboard',
  ],
  business: [
    'Lead capture center (forms, chat, ads)',
    'Pipeline and follow-up automations',
    'Proposal, invoicing, and payment workflows',
    'Referral and loyalty automation',
    'Retention and reactivation engine',
  ],
  game: [
    'Game blueprint planner',
    'Mechanic and progression module library',
    'Live ops analytics',
    'Marketplace packaging and release manager',
    'Creator monetization dashboard',
  ],
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function detectBlueprint(message: string, explicit?: string): BlueprintType {
  const rawExplicit = normalizeText(explicit).toLowerCase();
  if (rawExplicit === 'website' || rawExplicit === 'app' || rawExplicit === 'business' || rawExplicit === 'game') {
    return rawExplicit;
  }

  const content = message.toLowerCase();

  if (/landing|website|seo|domain|funnel/.test(content)) return 'website';
  if (/crm|pipeline|sales|lead|automation|gohighlevel/.test(content)) return 'business';
  if (/mobile app|saas|dashboard|portal|api|product/.test(content)) return 'app';
  if (/game|roblox|creator|marketplace/.test(content)) return 'game';

  return 'app';
}

function buildSalesSystem(blueprint: BlueprintType): SalesSystem {
  const offerByBlueprint: Record<BlueprintType, string> = {
    website: 'Launch-ready high-converting website in 7 days',
    app: 'MVP app with AI workflows and conversion tracking in 21 days',
    business: 'AI revenue system with lead capture, follow-up, and close flows in 14 days',
    game: 'Marketplace-ready game builder package with live ops in 30 days',
  };

  return {
    offer: offerByBlueprint[blueprint],
    funnelStages: [
      'Traffic and discovery capture',
      'Qualification and segmentation',
      'Offer presentation and social proof',
      'Proposal and payment close',
      'Retention + referral expansion',
    ],
    automationPrompts: [
      'Write a concise SMS follow-up for a warm inbound lead who requested a demo.',
      'Generate a 3-email sequence that handles budget objections and moves to call booking.',
      'Create a same-day close script for leads who already viewed pricing.',
      'Generate a referral request message 7 days after successful project delivery.',
    ],
    followUpCadence: [
      'T+5 min: instant acknowledgement with scheduling link',
      'T+2 hr: authority-building proof message',
      'T+24 hr: objection handling and offer restatement',
      'T+72 hr: urgency-based CTA and limited-slot reminder',
      'T+7 day: reactivation with revised entry offer',
    ],
    kpiTargets: [
      'Lead-to-call booking >= 30%',
      'Call-to-close >= 25%',
      'Follow-up response rate >= 40%',
      'Referral rate >= 10% of closed deals',
    ],
  };
}

function buildVoiceAgentPack(blueprint: BlueprintType): VoiceAgentPack {
  return {
    persona: `${blueprint.toUpperCase()} Concierge Closer`,
    openingScript:
      'Thanks for reaching out. I can scope your project in under five minutes and share a clear next step today.',
    qualificationQuestions: [
      'What outcome do you need in the next 30 days?',
      'Do you already have an existing site, app, or workflow stack?',
      'What budget range is approved for this project?',
      'Who is the final decision maker and timeline owner?',
    ],
    objectionHandlers: [
      'If budget is tight, offer a phased starter package with immediate ROI milestones.',
      'If timing is uncertain, frame the cost of delay and give a short pilot option.',
      'If trust is low, provide a transparent build plan with week-by-week checkpoints.',
    ],
    closeScript:
      'Based on your goals, I recommend we start with a focused build sprint. I can reserve an implementation slot and send your kickoff checklist now.',
  };
}

function buildImplementationPlan(blueprint: BlueprintType, message: string): PlanStep[] {
  return [
    {
      phase: 'Discovery and architecture',
      owner: 'Planning Agent',
      tasks: [
        `Parse objective and constraints from request: ${message.slice(0, 120)}`,
        'Generate technical scope and phased milestone plan',
        'Define measurable conversion and delivery KPIs',
      ],
    },
    {
      phase: 'Build and integration',
      owner: 'Code Agent',
      tasks: [
        `Create ${blueprint} modules and API contracts`,
        'Implement UI scaffolds and shared components',
        'Connect CRM, follow-up workflows, and analytics events',
      ],
    },
    {
      phase: 'Go-to-market and sales systems',
      owner: 'SEO + Content Agents',
      tasks: [
        'Generate offer messaging and objection handling copy',
        'Deploy SEO pages, GEO content loops, and lead magnets',
        'Enable conversation + voice scripts for inbound close flow',
      ],
    },
    {
      phase: 'Autonomous optimization',
      owner: 'Analytics + Ops Agents',
      tasks: [
        'Run daily quality checks and bug sweeps',
        'Execute conversion experiments on hero, CTA, and offer framing',
        'Queue self-improvement backlog items into CTO task loop',
      ],
    },
  ];
}

function buildDomainSuggestions(message: string): string[] {
  const seed = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 3)
    .join('');

  const base = seed || 'cortexlaunch';

  return [
    `${base}.com`,
    `${base}hq.com`,
    `get${base}.com`,
    `${base}.ai`,
    `${base}systems.com`,
  ];
}

function buildCodeChangeSuggestions(blueprint: BlueprintType): CodeChangeSuggestion[] {
  const objectiveMap: Record<BlueprintType, string> = {
    website: 'Improve website builder UX, templates, and SEO instrumentation',
    app: 'Improve app builder flow, API contracts, and guided implementation',
    business: 'Improve CRM + sales automation system and close-rate prompts',
    game: 'Improve game builder module generation and marketplace packaging',
  };

  return [
    {
      objective: `${objectiveMap[blueprint]} (plan pass)`,
      agentType: 'planning',
      mode: 'propose',
      dryRunRecommended: true,
      taskPayload: JSON.stringify(
        {
          blueprint,
          operation: 'plan-upgrade',
          goals: [
            'Map architecture changes',
            'List API and UI updates',
            'Define tests and rollout steps',
          ],
        },
        null,
        2
      ),
    },
    {
      objective: `${objectiveMap[blueprint]} (safe code edits)`,
      agentType: 'code',
      mode: 'propose',
      dryRunRecommended: true,
      taskPayload: JSON.stringify(
        {
          blueprint,
          operation: 'implement-upgrade',
          commands: ['npm run lint', 'npm run build'],
          constraints: [
            'Avoid destructive git operations',
            'Preserve existing public APIs when possible',
            'Add tests for changed behavior',
          ],
        },
        null,
        2
      ),
    },
    {
      objective: `${objectiveMap[blueprint]} (approved apply pass)`,
      agentType: 'code',
      mode: 'apply',
      dryRunRecommended: false,
      taskPayload: JSON.stringify(
        {
          blueprint,
          operation: 'apply-approved-changes',
          requiresHumanApproval: true,
          commands: ['npm run lint', 'npm run build'],
        },
        null,
        2
      ),
    },
  ];
}

export function generateBuilderConciergeResponse(input: BuilderConciergeInput): BuilderConciergeOutput {
  const message = normalizeText(input.message);
  const blueprint = detectBlueprint(message, input.blueprint);

  const implementationPlan = buildImplementationPlan(blueprint, message || 'No message provided');
  const salesSystem = buildSalesSystem(blueprint);
  const voiceAgent = buildVoiceAgentPack(blueprint);

  const summary = [
    `Detected focus: ${blueprint} builder.`,
    'Recommended flow: discovery -> build -> sales activation -> autonomous optimization.',
    'Execution should start in propose + dry-run mode, then move to approved apply mode for direct code edits.',
  ].join(' ');

  return {
    summary,
    detectedBlueprint: blueprint,
    implementationPlan,
    websiteSections: WEBSITE_SECTION_LIBRARY[blueprint],
    appModules: APP_MODULE_LIBRARY[blueprint],
    salesSystem,
    voiceAgent,
    domainSuggestions: input.includeDomainSales === false ? [] : buildDomainSuggestions(message),
    autonomousGrowthSuggestions: input.includeAutonomousIdeas === false
      ? []
      : [
          'Run daily bug + regression scan and queue fixes automatically.',
          'Generate and publish weekly SEO/GEO blog content tied to lead magnets.',
          'Trigger follow-up campaigns based on pipeline stage and inactivity windows.',
          'Rotate hero + CTA experiments and promote top-performing variants.',
        ],
    codeChangeSuggestions: buildCodeChangeSuggestions(blueprint),
    nextActions: [
      'Choose a blueprint and run plan mode first.',
      'Review generated tasks and code-change payload.',
      'Approve apply mode with human token only after validation.',
      'Track conversion and delivery metrics in weekly loop.',
    ],
  };
}
