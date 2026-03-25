import { normalizeBrandDnaProfile, type BrandDnaProfile } from '@/src/builder/brand-dna';

export type BlueprintType = 'website' | 'app' | 'business' | 'game';

export type IntegrationOption =
  | 'zapier'
  | 'make'
  | 'webhooks'
  | 'stripe'
  | 'twilio'
  | 'hubspot'
  | 'google-ads'
  | 'custom-api';

export type WorkflowPlan = {
  name: string;
  trigger: string;
  actions: string[];
  automationLogic: string;
};

export type FunnelPlan = {
  name: string;
  pages: string[];
  conversionGoal: string;
  automationHooks: string[];
};

export type CrmPipelinePlan = {
  stages: string[];
  automations: string[];
  scoreSignals: string[];
};

export type AiLayerPlan = {
  nativeTools: string[];
  apiIntegrations: string[];
  promptPacks: string[];
};

export type SnapshotTemplate = {
  name: string;
  includes: string[];
  bestFor: string;
};

export type ExternalIntegrationPlan = {
  platform: string;
  purpose: string;
  trigger: string;
  action: string;
};

export type CoreOfferPlan = {
  positioning: string;
  secondary: string;
};

export type ProductStackPlan = {
  leadCaptureLayer: string[];
  conversionLayer: string[];
  estimationLayer: string[];
  pipelineLayer: string[];
  followUpEngine: string[];
  reputationEngine: string[];
  emailSmsAutomation: string[];
  calendarsAndBooking: string[];
  aiChatAutomationTools: string[];
  reportingDashboard: string[];
};

export type PricingOption = {
  name: string;
  setup: string;
  monthly: string;
  optional?: string;
  bestFor: string;
};

export type OfferPackagePlan = {
  name: string;
  includes: string[];
};

export type SalesScriptPlan = {
  coldOpener: string;
  problemAgitation: string;
  pitch: string;
  proofFraming: string;
  close: string;
};

export type LandingPageSectionPlan = {
  section: string;
  headline: string;
  supporting: string;
};

export type AcquisitionChannelPlan = {
  channel: string;
  tactics: string[];
  priority: 'primary' | 'secondary';
};

export type ExpansionPhasePlan = {
  phase: string;
  focus: string[];
};

export type ClientAccountModel = {
  accountIsolation: string;
  provisioningFlow: string[];
  roleModel: string[];
  subscriptionBilling: string[];
};

export type BlueprintQualityScorecard = {
  visualDirection: string;
  uxMaturity: string;
  frontendArchitecture: string;
  performanceBudget: string;
  conversionDesign: string;
  overallScore: number;
};

export type ImplementationPacket = {
  packet: string;
  goals: string[];
  fileTargets: string[];
  acceptanceCriteria: string[];
};

export type BlueprintAiV1 = {
  version: 'v1.1';
  qualityTier: 'foundation' | 'premium';
  brandDna: BrandDnaProfile;
  scorecard: BlueprintQualityScorecard;
  implementationPackets: ImplementationPacket[];
};

export type AutomationBlueprint = {
  summary: string;
  detectedBlueprint: BlueprintType;
  blueprintAi: BlueprintAiV1;
  coreOffer: CoreOfferPlan;
  productStack: ProductStackPlan;
  buildWorkflows: WorkflowPlan[];
  funnels: FunnelPlan[];
  crmPipeline: CrmPipelinePlan;
  aiLayer: AiLayerPlan;
  snapshots: SnapshotTemplate[];
  integrations: ExternalIntegrationPlan[];
  pricingOptions: PricingOption[];
  offerPackages: OfferPackagePlan[];
  salesScript: SalesScriptPlan;
  landingPageLayout: LandingPageSectionPlan[];
  acquisitionChannels: AcquisitionChannelPlan[];
  expansionPath: ExpansionPhasePlan[];
  clientAccountModel: ClientAccountModel;
  roadmap: string[];
  suggestions: string[];
};

export type AutomationBlueprintInput = {
  prompt: string;
  blueprint?: string;
  selectedIntegrations?: string[];
  qualityTier?: 'foundation' | 'premium';
  brandDna?: unknown;
};

export const AVAILABLE_INTEGRATIONS: Array<{ id: IntegrationOption; label: string }> = [
  { id: 'zapier', label: 'Zapier' },
  { id: 'make', label: 'Make' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'twilio', label: 'Twilio' },
  { id: 'hubspot', label: 'HubSpot' },
  { id: 'google-ads', label: 'Google Ads' },
  { id: 'custom-api', label: 'Custom API' },
];

const CORE_OFFER_POSITIONING =
  'We install a system that turns inbound leads into booked jobs automatically.';

const CORE_OFFER_SECONDARY =
  'From missed call -> estimate -> booked job without manual follow-up';

const CONTRACTOR_PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Estimate Sent',
  'Follow-Up',
  'Won',
  'Lost',
];

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBlueprint(value: unknown): BlueprintType {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'website' || raw === 'app' || raw === 'business' || raw === 'game') {
    return raw;
  }
  return 'business';
}

function normalizeIntegrations(value: unknown): IntegrationOption[] {
  if (!Array.isArray(value)) return ['zapier', 'webhooks', 'custom-api'];

  const seen = new Set<IntegrationOption>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().toLowerCase() as IntegrationOption;
    if (!AVAILABLE_INTEGRATIONS.some((option) => option.id === normalized)) continue;
    seen.add(normalized);
    if (seen.size >= 8) break;
  }

  if (seen.size === 0) {
    return ['zapier', 'webhooks', 'custom-api'];
  }

  return Array.from(seen);
}

function deriveIndustry(prompt: string): string {
  const value = prompt.toLowerCase();
  if (/contract|construction|roof|remodel|deck|hvac|plumb/.test(value)) return 'contractor services';
  if (/clean|janitorial/.test(value)) return 'cleaning services';
  if (/agency|marketing/.test(value)) return 'agency services';
  if (/saas|software|app/.test(value)) return 'software product';
  return 'service business';
}

function buildWorkflowPlans(industry: string): WorkflowPlan[] {
  return [
    {
      name: 'Lead Capture + Instant Response',
      trigger: 'New funnel form, call tracking event, or chat lead',
      actions: [
        'Capture lead source and campaign tags in CRM contacts',
        'Run missed-call text back instantly when call is not answered',
        'Send instant SMS response in under 60 seconds',
        'Run AI qualification for job type, urgency, and budget',
      ],
      automationLogic:
        'If lead intent score is high, move to Contacted and send booking link. Otherwise enroll in short nurture sequence.',
    },
    {
      name: 'Estimate to Booking Engine',
      trigger: 'Lead reaches Contacted stage',
      actions: [
        'Launch guided estimate form or AI-assisted estimator',
        'Generate dynamic price range and formal quote draft',
        'Auto-send quote by SMS and email with booking link',
        'Create follow-up reminder if quote is viewed but booking is incomplete',
      ],
      automationLogic:
        'If estimate is not accepted within 24 hours, trigger quote reminder and owner task. If booked, move directly to Won.',
    },
    {
      name: 'Follow-Up Recovery Engine',
      trigger: 'Estimate Sent with no booking',
      actions: [
        'Run 7 to 14 day SMS and email sequence',
        'Send still-need-this-done nudges and objection replies',
        'Escalate high-intent leads to live call queue',
      ],
      automationLogic: 'End sequence as soon as lead books or opts out.',
    },
    {
      name: 'Reputation and Referral Engine',
      trigger: 'Job marked Won and completed',
      actions: [
        'Auto-send review request with Google review link',
        'Trigger referral request after positive completion response',
        'Log review and referral outcomes in reporting dashboard',
      ],
      automationLogic: 'If no review in 72 hours, send one reminder and then close the request loop.',
    },
  ].map((workflow) => ({
    ...workflow,
    actions: workflow.actions.map((item) => item.replace('job', `${industry} job`)),
  }));
}

function buildFunnels(blueprint: BlueprintType, industry: string): FunnelPlan[] {
  const topName = blueprint === 'app' ? 'Contractor App Booking Funnel' : 'Missed Call to Booked Job Funnel';

  return [
    {
      name: topName,
      pages: [
        'Headline: Turn Missed Calls Into Booked Jobs Automatically',
        'Problem: Lost leads, slow responses, no follow-up',
        'Solution flow: Lead -> Instant Response -> Estimate -> Booking',
        'Features: instant replies, auto estimates, booking',
        'Proof: screenshots, metrics, testimonials',
        'Offer and pricing section',
        'CTA: Book Demo / Get System Installed',
      ],
      conversionGoal: 'Booked demo and system install call',
      automationHooks: [
        'Create contact and pipeline record from form or call event',
        'Send SMS opt-in confirmation and instant responder kickoff',
        'Track CTA clicks and quote request conversion events',
      ],
    },
    {
      name: `${industry} Local Reactivation Funnel`,
      pages: ['Local proof page', 'Quote reminder page', 'Booking recovery page'],
      conversionGoal: 'Recover unresponsive leads and move them to booked jobs',
      automationHooks: [
        'Launch 7 to 14 day SMS and email reactivation sequence',
        'Sync reactivation audiences into Google Ads and social channels',
        'Escalate warm leads to calendar booking prompts',
      ],
    },
  ];
}

function buildPipeline(industry: string): CrmPipelinePlan {
  return {
    stages: CONTRACTOR_PIPELINE_STAGES,
    automations: [
      'Auto-assign owner and first response task when lead enters New Lead',
      'Move to Contacted automatically after instant SMS response',
      'Trigger quote reminders while in Estimate Sent',
      'Launch follow-up cadence while in Follow-Up',
      'Send review and referral flow when moved to Won',
    ],
    scoreSignals: [
      `Intent keywords for ${industry}`,
      'Response speed under 60 seconds',
      'Booking link clicks and calendar completions',
      'Estimate opens and quote reminder engagement',
      'Inbound call and SMS engagement depth',
    ],
  };
}

function buildAiLayer(industry: string): AiLayerPlan {
  return {
    nativeTools: [
      'AI SMS responder with stage-aware follow-up prompts',
      'AI lead qualification for job type, urgency, and budget',
      'AI estimate assistant for guided quote generation',
      'AI chat concierge for lead routing and appointment scheduling',
    ],
    apiIntegrations: [
      'OpenAI or equivalent LLM provider for generation and summarization',
      'Voice agent provider for inbound and outbound scripts',
      'Webhook gateway for third-party automation triggers',
      'Calendar API integrations for booking sync and reminders',
    ],
    promptPacks: [
      `${industry} lead qualification prompts`,
      'Estimate follow-up and objection handling prompts',
      'Review request and referral request scripts',
      'Reactivation prompts for stale opportunities',
    ],
  };
}

function buildSnapshots(): SnapshotTemplate[] {
  return [
    {
      name: 'Snapshot 1: General Contractor',
      includes: ['Funnel', 'Pipeline', 'Automations', 'SMS scripts', 'Email sequences'],
      bestFor: 'General contractor lead capture and booking automation',
    },
    {
      name: 'Snapshot 2: Roofing',
      includes: ['Funnel', 'Pipeline', 'Automations', 'SMS scripts', 'Email sequences'],
      bestFor: 'Roofing estimate and storm-season follow-up campaigns',
    },
    {
      name: 'Snapshot 3: Cleaning',
      includes: ['Funnel', 'Pipeline', 'Automations', 'SMS scripts', 'Email sequences'],
      bestFor: 'Recurring cleaning bookings and retention nudges',
    },
    {
      name: 'Snapshot 4: HVAC',
      includes: ['Funnel', 'Pipeline', 'Automations', 'SMS scripts', 'Email sequences'],
      bestFor: 'Urgency-driven HVAC inbound and seasonal service campaigns',
    },
  ];
}

function buildCoreOffer(): CoreOfferPlan {
  return {
    positioning: CORE_OFFER_POSITIONING,
    secondary: CORE_OFFER_SECONDARY,
  };
}

function buildProductStack(): ProductStackPlan {
  return {
    leadCaptureLayer: ['Landing page/funnel', 'Call tracking number', 'Form + SMS opt-in'],
    conversionLayer: [
      'Missed call text-back',
      'Instant SMS response under 60 seconds',
      'AI qualification for job type, urgency, and budget',
      'Booking link with stage tracking',
    ],
    estimationLayer: [
      'Guided estimate form and AI-assisted estimator',
      'Auto-send quote via SMS and email',
      'Optional dynamic pricing ranges by service type',
    ],
    pipelineLayer: CONTRACTOR_PIPELINE_STAGES,
    followUpEngine: [
      '7 to 14 day SMS and email sequence',
      'Still-need-this-done nudges',
      'Quote reminders and warm-lead escalations',
    ],
    reputationEngine: ['Auto review request after job completion', 'Google review link delivery and reminder'],
    emailSmsAutomation: [
      'Stage-based autoresponders',
      'Bid reminder cadence',
      'Reactivation campaign for stale opportunities',
    ],
    calendarsAndBooking: [
      'Booking links embedded in SMS, email, and funnels',
      'Calendar sync with automatic reminders',
      'No-show follow-up workflow',
    ],
    aiChatAutomationTools: [
      'AI chat concierge for inbound qualification',
      'AI SMS assistant for quote and follow-up replies',
      'Automation tools via Zapier, webhooks, and custom APIs',
    ],
    reportingDashboard: [
      'Leads by source and close rate',
      'Response-time under 60 seconds tracker',
      'Estimate sent vs booked conversion rate',
      'Review and referral completion metrics',
    ],
  };
}

function buildPricingOptions(): PricingOption[] {
  return [
    {
      name: 'Option A (simplest, high close rate)',
      setup: '$1,000 - $2,500',
      monthly: '$197 - $497',
      bestFor: 'Fast-close contractors starting automation now',
    },
    {
      name: 'Option B (higher leverage)',
      setup: '$500 - $1,000',
      monthly: '$297 - $697',
      bestFor: 'Contractors preferring lower setup and higher monthly support',
    },
    {
      name: 'Option C (premium hybrid)',
      setup: '$2,000+',
      monthly: '$497+',
      optional: '% of booked jobs (optional)',
      bestFor: 'Teams wanting premium implementation with performance upside',
    },
  ];
}

function buildOfferPackages(): OfferPackagePlan[] {
  return [
    {
      name: 'Core System',
      includes: ['CRM', 'Automations', 'Booking', 'Follow-ups'],
    },
    {
      name: 'AI Upgrade',
      includes: ['AI SMS responder', 'AI lead qualification', 'AI estimate assistant'],
    },
    {
      name: 'Growth Add-on',
      includes: ['Landing page', 'Review system', 'Reactivation campaigns'],
    },
  ];
}

function buildSalesScript(): SalesScriptPlan {
  return {
    coldOpener: 'Quick question - how are you currently handling missed calls and unresponsive leads?',
    problemAgitation: 'Most contractors lose 30-50% of inbound leads just from slow follow-up.',
    pitch:
      'We install a system that instantly responds to every lead, qualifies them, sends estimates, and books jobs automatically.',
    proofFraming: 'It is basically like having a 24/7 sales assistant that never misses a lead.',
    close: 'If I could show you how this brings in even 2-5 extra jobs per month, would it be worth a quick walkthrough?',
  };
}

function buildLandingPageLayout(): LandingPageSectionPlan[] {
  return [
    {
      section: 'Section 1: Headline',
      headline: 'Turn Missed Calls Into Booked Jobs Automatically',
      supporting: 'AI-powered follow-up, estimates, and booking for contractors',
    },
    {
      section: 'Section 2: Problem',
      headline: 'Lost leads from slow response and weak follow-up',
      supporting: 'Highlight missed leads, delayed responses, and no follow-up behavior.',
    },
    {
      section: 'Section 3: Solution (visual flow)',
      headline: 'Lead -> Instant Response -> Estimate -> Booking',
      supporting: 'Use one visual flow to explain the operating system.',
    },
    {
      section: 'Section 4: Features',
      headline: 'Instant responses, automatic estimates, full calendar',
      supporting: 'Outcome-first feature framing for speed and booked jobs.',
    },
    {
      section: 'Section 5: Proof',
      headline: 'Screenshots, metrics, and testimonials',
      supporting: 'Prioritize measurable before/after outcomes.',
    },
    {
      section: 'Section 6: Offer',
      headline: 'Done-for-you setup plus monthly automation support',
      supporting: 'Clearly display setup and monthly plan options.',
    },
    {
      section: 'Section 7: CTA',
      headline: 'Book Demo / Get System Installed',
      supporting: 'Use direct action verbs with short form completion path.',
    },
    {
      section: 'Section 8: Small text',
      headline: 'Free trial available',
      supporting: 'Keep low emphasis below primary CTA.',
    },
  ];
}

function buildAcquisitionChannels(): AcquisitionChannelPlan[] {
  return [
    {
      channel: 'Cold outreach (primary)',
      tactics: ['Facebook groups (contractors)', 'Local business pages', 'Direct SMS and email outreach'],
      priority: 'primary',
    },
    {
      channel: 'Loom audits',
      tactics: ['Record 3-5 minute teardown', 'Highlight where leads are being lost', 'Offer quick fix walkthrough'],
      priority: 'secondary',
    },
    {
      channel: 'Local targeting',
      tactics: ['Eagan', 'Burnsville', 'Minneapolis'],
      priority: 'secondary',
    },
  ];
}

function buildExpansionPath(): ExpansionPhasePlan[] {
  return [
    {
      phase: 'Phase 1',
      focus: ['Sell direct', 'Install manually', 'Refine the system from live feedback'],
    },
    {
      phase: 'Phase 2',
      focus: ['Productize snapshots', 'Reduce onboarding time', 'Standardize launch in under 30 minutes'],
    },
    {
      phase: 'Phase 3',
      focus: ['Launch reseller program', 'Enable agencies to sell your platform', 'Scale with account templates'],
    },
  ];
}

function buildClientAccountModel(): ClientAccountModel {
  return {
    accountIsolation: 'Multi-tenant client workspaces with isolated contacts, pipelines, automation, and analytics.',
    provisioningFlow: [
      'Create client account and assign snapshot template',
      'Provision CRM, funnel, automation, and scripts in one workflow',
      'Deliver live account with calendar and billing enabled',
    ],
    roleModel: ['Owner admin', 'Client manager', 'Sales rep', 'Read-only analyst'],
    subscriptionBilling: [
      'Monthly subscriptions with plan-based feature access',
      'Usage-aware overage hooks for premium automation and AI volume',
      'Dunning flow for failed payments and grace-period recovery',
    ],
  };
}

function buildQualityScorecard(blueprint: BlueprintType, qualityTier: 'foundation' | 'premium'): BlueprintQualityScorecard {
  const premiumBoost = qualityTier === 'premium' ? 10 : 0;
  const baseScore = blueprint === 'website' ? 80 : blueprint === 'app' ? 82 : blueprint === 'business' ? 78 : 76;

  return {
    visualDirection:
      qualityTier === 'premium'
        ? 'Editorial-grade visual system with custom typography scale and component choreography'
        : 'Conversion-first UI baseline with reusable sections and clean hierarchy',
    uxMaturity:
      qualityTier === 'premium'
        ? 'Task-first, persona-aware flows with reduced friction and progressive disclosure'
        : 'Guided onboarding and clear CTA progression',
    frontendArchitecture:
      qualityTier === 'premium'
        ? 'Tokenized design system, typed API contracts, and modular state boundaries'
        : 'Componentized layout system and route-level separation',
    performanceBudget:
      qualityTier === 'premium'
        ? 'LCP < 2.2s, TTI < 2.5s, image and script budgets enforced in CI'
        : 'LCP < 2.8s with lazy loading and route splitting',
    conversionDesign:
      qualityTier === 'premium'
        ? 'Hypothesis-driven experiments with weekly hero/CTA optimization'
        : 'Baseline funnel instrumentation and lead event tracking',
    overallScore: Math.min(99, baseScore + premiumBoost),
  };
}

function buildImplementationPackets(blueprint: BlueprintType, qualityTier: 'foundation' | 'premium'): ImplementationPacket[] {
  const isPremium = qualityTier === 'premium';

  return [
    {
      packet: 'Frontend Experience Upgrade',
      goals: [
        'Establish a high-end visual direction and design-token strategy',
        'Improve conversion path clarity and trust markers',
      ],
      fileTargets: ['app', 'components', 'app/globals.css'],
      acceptanceCriteria: [
        'Primary landing and builder pages render consistently across mobile/desktop',
        'All CTA paths emit analytics conversion events',
        isPremium
          ? 'Typography, spacing, and motion system are documented and reusable'
          : 'Reusable section layout patterns are documented',
      ],
    },
    {
      packet: 'Assistant-Guided Code Changes',
      goals: [
        'Provide deterministic edit packets for planning and apply passes',
        'Gate apply mode with approval and entitlement checks',
      ],
      fileTargets: ['app/api/builder/concierge/route.ts', 'src/builder/concierge.ts', 'src/platform/approval-lifecycle.ts'],
      acceptanceCriteria: [
        'Plan pass generates ordered tasks, file targets, and test commands',
        'Apply pass requires explicit operator or admin authorization',
      ],
    },
    {
      packet: 'Operational Quality Guardrails',
      goals: [
        'Track build quality via scorecards and release checks',
        'Integrate entitlement-aware feature toggles for premium builder capabilities',
      ],
      fileTargets: ['src/billing/entitlements.ts', 'app/api/subscription/entitlements/route.ts', 'app/api/builder/automation-plan/route.ts'],
      acceptanceCriteria: [
        'Premium blueprint options are denied when feature is not entitled',
        'Quality scorecard appears in blueprint output',
      ],
    },
  ];
}

function buildIntegrationPlans(selected: IntegrationOption[]): ExternalIntegrationPlan[] {
  const plans: Record<IntegrationOption, ExternalIntegrationPlan> = {
    zapier: {
      platform: 'Zapier',
      purpose: 'No-code app-to-app automation',
      trigger: 'New lead in CRM',
      action: 'Create tasks, send notifications, and sync to campaign tools',
    },
    make: {
      platform: 'Make',
      purpose: 'Advanced multi-step automation scenarios',
      trigger: 'Pipeline stage changed to Proposal Sent',
      action: 'Run branching scenario for reminder cadence and owner escalation',
    },
    webhooks: {
      platform: 'Webhooks',
      purpose: 'Direct event-based integrations',
      trigger: 'Conversion event fired',
      action: 'Push event payload into analytics and optimization engine',
    },
    stripe: {
      platform: 'Stripe',
      purpose: 'Payments and billing automation',
      trigger: 'Proposal accepted',
      action: 'Generate checkout and move lead to Won on successful payment',
    },
    twilio: {
      platform: 'Twilio',
      purpose: 'SMS and voice follow-up automation',
      trigger: 'No response after 24h',
      action: 'Send stage-aware SMS and queue voice callback script',
    },
    hubspot: {
      platform: 'HubSpot',
      purpose: 'CRM and campaign sync',
      trigger: 'Lead qualification complete',
      action: 'Create or update contact and push lifecycle stage',
    },
    'google-ads': {
      platform: 'Google Ads',
      purpose: 'Audience and conversion feedback loop',
      trigger: 'Lead scored high intent',
      action: 'Sync remarketing audience and conversion event values',
    },
    'custom-api': {
      platform: 'Custom API',
      purpose: 'Internal platform extensions',
      trigger: 'Assistant requests deployment or snapshot export',
      action: 'Invoke authenticated endpoint and log deployment metadata',
    },
  };

  return selected.map((id) => plans[id]);
}

export function generateAutomationBlueprint(input: AutomationBlueprintInput): AutomationBlueprint {
  const prompt = normalizeText(input.prompt);
  const detectedBlueprint = normalizeBlueprint(input.blueprint);
  const selectedIntegrations = normalizeIntegrations(input.selectedIntegrations);
  const qualityTier = input.qualityTier === 'premium' ? 'premium' : 'foundation';
  const brandDna = normalizeBrandDnaProfile(input.brandDna);
  const industry = deriveIndustry(prompt);

  const coreOffer = buildCoreOffer();
  const productStack = buildProductStack();
  const buildWorkflows = buildWorkflowPlans(industry);
  const funnels = buildFunnels(detectedBlueprint, industry);
  const crmPipeline = buildPipeline(industry);
  const aiLayer = buildAiLayer(industry);
  const snapshots = buildSnapshots();
  const integrations = buildIntegrationPlans(selectedIntegrations);
  const pricingOptions = buildPricingOptions();
  const offerPackages = buildOfferPackages();
  const salesScript = buildSalesScript();
  const landingPageLayout = buildLandingPageLayout();
  const acquisitionChannels = buildAcquisitionChannels();
  const expansionPath = buildExpansionPath();
  const clientAccountModel = buildClientAccountModel();
  const blueprintAi: BlueprintAiV1 = {
    version: 'v1.1',
    qualityTier,
    brandDna,
    scorecard: buildQualityScorecard(detectedBlueprint, qualityTier),
    implementationPackets: buildImplementationPackets(detectedBlueprint, qualityTier),
  };

  return {
    summary:
      `Automation blueprint generated for ${industry} with ${detectedBlueprint} execution focus. ` +
      'Includes lead capture, conversion, estimation, CRM pipeline, follow-up/reputation loops, snapshot templates, and client-account monetization.',
    detectedBlueprint,
    blueprintAi,
    coreOffer,
    productStack,
    buildWorkflows,
    funnels,
    crmPipeline,
    aiLayer,
    snapshots,
    integrations,
    pricingOptions,
    offerPackages,
    salesScript,
    landingPageLayout,
    acquisitionChannels,
    expansionPath,
    clientAccountModel,
    roadmap: [
      'Week 1: Deploy lead capture layer, call tracking, and instant text-back automation.',
      'Week 2: Ship estimator flow, quote delivery, and booking sync with calendar APIs.',
      'Week 3: Activate 7-14 day follow-up engine plus review and referral automations.',
      'Week 4: Launch snapshot provisioning + subscription billing + client account rollout.',
    ],
    suggestions: [
      'Start by validating the missed-call to booking automation path end to end.',
      'Instrument every funnel and pipeline stage transition with conversion events.',
      'Use one-click snapshots to launch new client accounts in under 30 minutes.',
      'Tie every monthly subscription plan to account-level feature flags and limits.',
    ],
  };
}
