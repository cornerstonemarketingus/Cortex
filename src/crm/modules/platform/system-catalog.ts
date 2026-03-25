export type LifecyclePhase = 'capture' | 'nurture' | 'close' | 'evangelize' | 'reactivate';
export type ModuleStatus = 'live' | 'v1' | 'planned';

export type CrmSystemModule = {
  id: string;
  name: string;
  phase: LifecyclePhase;
  status: ModuleStatus;
  domains: string[];
  description: string;
  aiAdvancements: string[];
  existingRoutes: string[];
};

export type SystemCatalogFilter = {
  phase?: LifecyclePhase;
  status?: ModuleStatus;
  domain?: string;
  search?: string;
  limit?: number;
};

export type RolloutScope =
  | 'all'
  | 'missing'
  | LifecyclePhase
  | 'game-builder'
  | 'business-builder'
  | 'conversation-ai';

export type RolloutTask = {
  moduleId: string;
  moduleName: string;
  phase: LifecyclePhase;
  priority: 'p0' | 'p1' | 'p2';
  type: 'feature';
  description: string;
};

export const CUSTOMER_LIFECYCLE: LifecyclePhase[] = [
  'capture',
  'nurture',
  'close',
  'evangelize',
  'reactivate',
];

export const CRM_SYSTEM_CATALOG: CrmSystemModule[] = [
  {
    id: 'ai-crm-core',
    name: 'AI CRM Core',
    phase: 'capture',
    status: 'live',
    domains: ['crm', 'foundation', 'ai'],
    description: 'Unified CRM orchestration across lead capture, communication, and lifecycle automation.',
    aiAdvancements: ['agent routing', 'context memory', 'predictive workflow triggers'],
    existingRoutes: ['/api/crm/capture/leads', '/api/crm/nurture/workflows', '/api/crm/nurture/pipeline'],
  },
  {
    id: 'voice-ai',
    name: 'Voice AI',
    phase: 'nurture',
    status: 'v1',
    domains: ['conversation', 'ai'],
    description: 'Voice-led conversation assistant for inbound and outbound call contexts.',
    aiAdvancements: ['intent detection', 'summary generation', 'next-step recommendations'],
    existingRoutes: ['/api/crm/capture/calls'],
  },
  {
    id: 'forms-surveys-quizzes',
    name: 'Forms, Surveys, and Quizzes',
    phase: 'capture',
    status: 'v1',
    domains: ['capture', 'web'],
    description: 'High-conversion lead forms and qualification flows with structured answer capture.',
    aiAdvancements: ['adaptive questioning', 'auto-segmentation', 'qualification scoring'],
    existingRoutes: ['/api/crm/capture/forms', '/api/crm/capture/forms/[slug]'],
  },
  {
    id: 'websites-funnels-landing-pages',
    name: 'Websites, Funnels, and Landing Pages',
    phase: 'capture',
    status: 'live',
    domains: ['builder', 'web'],
    description: 'Builder workflow for landing pages and conversion-ready funnel experiences.',
    aiAdvancements: ['copy optimization', 'section generation', 'conversion analytics hints'],
    existingRoutes: ['/api/crm/capture/landing-pages'],
  },
  {
    id: 'webinar-funnels',
    name: 'Webinar Funnels',
    phase: 'capture',
    status: 'planned',
    domains: ['capture', 'events'],
    description: 'Registration funnels and follow-up journeys for webinar-led demand generation.',
    aiAdvancements: ['reminder sequences', 'attendance scoring', 'follow-up personalization'],
    existingRoutes: [],
  },
  {
    id: 'chat-widget-conversation-ai',
    name: 'Chat Widget and Conversation AI',
    phase: 'capture',
    status: 'live',
    domains: ['conversation', 'ai'],
    description: 'Embedded chat experience with bot routing and contextual response generation.',
    aiAdvancements: ['role-aware response synthesis', 'memory-grounded replies', 'multi-agent orchestration'],
    existingRoutes: ['/api/chat', '/api/bots', '/api/crm/capture/chat'],
  },
  {
    id: 'call-tracking',
    name: 'Call Tracking',
    phase: 'capture',
    status: 'live',
    domains: ['capture', 'conversation'],
    description: 'Inbound call logging and missed-call workflow triggering for follow-up automation.',
    aiAdvancements: ['call outcome tagging', 'priority routing', 'drop-off analysis'],
    existingRoutes: ['/api/crm/capture/calls'],
  },
  {
    id: 'inbound-sms-social-dms',
    name: 'Inbound SMS and Social DMs',
    phase: 'capture',
    status: 'live',
    domains: ['conversation', 'social'],
    description: 'Unified ingestion for inbound messages from SMS and social channels.',
    aiAdvancements: ['channel classification', 'intent extraction', 'handoff recommendations'],
    existingRoutes: ['/api/crm/capture/webhook', '/api/crm/nurture/messages'],
  },
  {
    id: 'social-planner',
    name: 'Social Planner',
    phase: 'nurture',
    status: 'v1',
    domains: ['social', 'retention'],
    description: 'Plan, queue, and schedule social content with campaign-aware automation.',
    aiAdvancements: ['content ideation', 'tone adaptation', 'timing optimization'],
    existingRoutes: ['/api/crm/retain/reviews/[id]/social-post'],
  },
  {
    id: 'missed-call-text-back',
    name: 'Missed Call Text-Back',
    phase: 'nurture',
    status: 'live',
    domains: ['conversation', 'automation'],
    description: 'Automatic SMS follow-up after missed inbound calls.',
    aiAdvancements: ['response templates', 'smart delay logic', 'lead priority handling'],
    existingRoutes: ['/api/crm/capture/calls', '/api/crm/nurture/workflows/trigger'],
  },
  {
    id: 'ai-biz-card-scanner',
    name: 'AI Business Card Scanner',
    phase: 'capture',
    status: 'live',
    domains: ['capture', 'ai'],
    description: 'OCR-based business card ingestion with lead enrichment and routing.',
    aiAdvancements: ['entity extraction', 'normalization', 'confidence fallback parsing'],
    existingRoutes: ['/api/crm/capture/business-card'],
  },
  {
    id: 'qr-codes',
    name: 'QR Codes',
    phase: 'capture',
    status: 'live',
    domains: ['capture', 'web'],
    description: 'QR-driven campaign entry points and lead capture routing.',
    aiAdvancements: ['context-aware destination selection', 'campaign attribution', 'funnel routing'],
    existingRoutes: ['/api/crm/capture/qr'],
  },
  {
    id: 'prospecting-tool',
    name: 'Prospecting Tool',
    phase: 'capture',
    status: 'v1',
    domains: ['sales', 'capture'],
    description: 'Prospect discovery and outreach planning pipeline for net-new lead generation.',
    aiAdvancements: ['prospect scoring', 'persona matching', 'outreach sequencing'],
    existingRoutes: ['/api/crm/capture/leads'],
  },
  {
    id: 'ad-manager-ai',
    name: 'AI Ad Manager (Google, Facebook, Instagram)',
    phase: 'capture',
    status: 'planned',
    domains: ['marketing', 'ads', 'ai'],
    description: 'AI-managed ad strategy, budget allocation, and performance tuning across platforms.',
    aiAdvancements: ['creative variation generation', 'audience expansion', 'budget optimization'],
    existingRoutes: [],
  },
  {
    id: 'consolidated-conversation-stream',
    name: 'Consolidated Conversation Stream',
    phase: 'nurture',
    status: 'live',
    domains: ['conversation', 'support'],
    description: 'Unified communication timeline across SMS, social, live chat, and inbox channels.',
    aiAdvancements: ['conversation summarization', 'priority triage', 'sentiment detection'],
    existingRoutes: ['/api/crm/nurture/inbox', '/api/crm/nurture/messages'],
  },
  {
    id: 'sales-pipelines',
    name: 'Sales Pipelines',
    phase: 'nurture',
    status: 'live',
    domains: ['sales', 'crm'],
    description: 'Pipeline visibility and stage progression for revenue operations.',
    aiAdvancements: ['stage movement prediction', 'deal risk scoring', 'next best action'],
    existingRoutes: ['/api/crm/nurture/pipeline'],
  },
  {
    id: 'workflows-automations',
    name: 'Workflows and Automations',
    phase: 'nurture',
    status: 'live',
    domains: ['automation', 'crm'],
    description: 'Trigger-based workflow engine for messaging, reminders, and stage updates.',
    aiAdvancements: ['condition evaluation', 'action orchestration', 'adaptive pathing'],
    existingRoutes: ['/api/crm/nurture/workflows', '/api/crm/nurture/workflows/trigger'],
  },
  {
    id: 'calendars',
    name: 'Calendars',
    phase: 'nurture',
    status: 'live',
    domains: ['scheduling', 'crm'],
    description: 'Appointment scheduling, availability windows, and booking management.',
    aiAdvancements: ['slot recommendation', 'timezone normalization', 'reschedule prioritization'],
    existingRoutes: ['/api/crm/nurture/appointments'],
  },
  {
    id: 'text-snippets',
    name: 'Text Snippets',
    phase: 'nurture',
    status: 'v1',
    domains: ['conversation', 'productivity'],
    description: 'Reusable snippet library for faster communication and follow-up consistency.',
    aiAdvancements: ['snippet suggestions', 'context-aware autofill', 'tone conversion'],
    existingRoutes: ['/api/crm/nurture/messages'],
  },
  {
    id: 'appointment-reminders',
    name: 'Appointment Reminders',
    phase: 'nurture',
    status: 'live',
    domains: ['automation', 'scheduling'],
    description: 'Automated reminder sequences for upcoming bookings and no-show prevention.',
    aiAdvancements: ['channel optimization', 'reminder cadence tuning', 'attendance prediction'],
    existingRoutes: ['/api/crm/nurture/workflows/trigger', '/api/crm/retain/cron/followups'],
  },
  {
    id: 'ringless-voicemail',
    name: 'Ringless Voicemail',
    phase: 'nurture',
    status: 'planned',
    domains: ['conversation', 'outbound'],
    description: 'Automated voicemail drop campaigns with campaign-level reporting.',
    aiAdvancements: ['script generation', 'timing optimization', 'follow-up branching'],
    existingRoutes: [],
  },
  {
    id: 'mobile-app-video-messages',
    name: 'Mobile App with Video Messages',
    phase: 'nurture',
    status: 'planned',
    domains: ['mobile', 'conversation'],
    description: 'Mobile-first interaction layer for video messaging and customer touchpoints.',
    aiAdvancements: ['video transcript summaries', 'engagement scoring', 'response suggestions'],
    existingRoutes: [],
  },
  {
    id: 'outbound-call-connect',
    name: 'Automated Outbound Call Connect',
    phase: 'nurture',
    status: 'planned',
    domains: ['outbound', 'conversation'],
    description: 'Automated connect flows for outbound lead follow-up and call routing.',
    aiAdvancements: ['dial priority modeling', 'connect-time optimization', 'objection handling prompts'],
    existingRoutes: [],
  },
  {
    id: 'lead-scoring',
    name: 'Lead Scoring',
    phase: 'close',
    status: 'live',
    domains: ['sales', 'ai'],
    description: 'Behavioral and intent-based lead scoring tied to close probability.',
    aiAdvancements: ['score recalibration', 'behavior weighting', 'deal acceleration cues'],
    existingRoutes: ['/api/crm/close/lead-score/[leadId]'],
  },
  {
    id: 'estimates-proposals',
    name: 'Estimates and Proposals',
    phase: 'close',
    status: 'live',
    domains: ['sales', 'payments'],
    description: 'Proposal drafting, pricing presentation, and PDF generation for closing.',
    aiAdvancements: ['line-item recommendations', 'pricing optimization', 'proposal personalization'],
    existingRoutes: ['/api/crm/close/proposals', '/api/crm/close/proposals/[id]/pdf'],
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    phase: 'close',
    status: 'live',
    domains: ['payments', 'finance'],
    description: 'Invoice creation and billing lifecycle tracking.',
    aiAdvancements: ['payment risk scoring', 'reminder sequencing', 'cashflow prioritization'],
    existingRoutes: ['/api/crm/close/invoices'],
  },
  {
    id: 'payment-integrations',
    name: 'Payment Integrations',
    phase: 'close',
    status: 'live',
    domains: ['payments'],
    description: 'Checkout and payment processing integrations with transaction tracking.',
    aiAdvancements: ['checkout optimization', 'fraud signals', 'retry recommendations'],
    existingRoutes: ['/api/crm/close/checkout', '/api/crm/close/stripe/webhook'],
  },
  {
    id: 'paid-calendars',
    name: 'Paid Calendars',
    phase: 'close',
    status: 'v1',
    domains: ['payments', 'scheduling'],
    description: 'Monetized scheduling flows with payment-first booking logic.',
    aiAdvancements: ['price sensitivity analysis', 'slot profitability ranking', 'upsell timing'],
    existingRoutes: ['/api/crm/nurture/appointments', '/api/crm/close/checkout'],
  },
  {
    id: 'order-forms-upsells-downsells',
    name: 'Order Forms, Upsells, and Downsells',
    phase: 'close',
    status: 'live',
    domains: ['payments', 'commerce'],
    description: 'Order capture with post-purchase upsell and downsell paths.',
    aiAdvancements: ['offer sequencing', 'basket uplift strategies', 'acceptance prediction'],
    existingRoutes: ['/api/crm/close/checkout'],
  },
  {
    id: 'membership-offers-courses',
    name: 'Membership Offers and Courses',
    phase: 'close',
    status: 'planned',
    domains: ['commerce', 'education'],
    description: 'Paid content access, memberships, and recurring-value offer engines.',
    aiAdvancements: ['course recommendation', 'engagement nudges', 'churn prevention'],
    existingRoutes: [],
  },
  {
    id: 'one-click-upsell-funnels',
    name: 'One-click Upsell Funnels',
    phase: 'close',
    status: 'v1',
    domains: ['commerce', 'payments'],
    description: 'Fast post-checkout upsell experiences with minimal friction.',
    aiAdvancements: ['offer fit prediction', 'price anchoring suggestions', 'timed promotions'],
    existingRoutes: ['/api/crm/close/checkout'],
  },
  {
    id: 'text-to-pay',
    name: 'Text-2-Pay',
    phase: 'close',
    status: 'live',
    domains: ['payments', 'conversation'],
    description: 'Payment link delivery through messaging channels for quick conversion.',
    aiAdvancements: ['send-time optimization', 'payment reminder cadence', 'reply intent classification'],
    existingRoutes: ['/api/crm/close/text-to-pay'],
  },
  {
    id: 'tap-to-pay',
    name: 'Tap-2-Pay',
    phase: 'close',
    status: 'v1',
    domains: ['payments', 'mobile'],
    description: 'Mobile-ready tap payment flow and on-device confirmation experiences.',
    aiAdvancements: ['device context routing', 'failure recovery', 'smart fallback options'],
    existingRoutes: ['/api/crm/close/checkout'],
  },
  {
    id: 'gift-cards',
    name: 'Gift Cards',
    phase: 'close',
    status: 'planned',
    domains: ['commerce', 'retention'],
    description: 'Gift card issuance, redemption tracking, and campaign tie-ins.',
    aiAdvancements: ['seasonal offer forecasting', 'redemption prediction', 'cross-sell pairing'],
    existingRoutes: [],
  },
  {
    id: 'loyalty-programs',
    name: 'Loyalty Programs',
    phase: 'evangelize',
    status: 'live',
    domains: ['retention', 'community'],
    description: 'Point and reward models to improve retention and customer advocacy.',
    aiAdvancements: ['reward optimization', 'tier progression modeling', 'churn prevention nudges'],
    existingRoutes: ['/api/crm/retain/loyalty/[leadId]', '/api/crm/retain/loyalty/award'],
  },
  {
    id: 'free-trial-engine',
    name: 'Start 14 Day Free Trial',
    phase: 'capture',
    status: 'v1',
    domains: ['growth', 'onboarding'],
    description: 'Trial activation journey with onboarding checkpoints and conversion nudges.',
    aiAdvancements: ['activation scoring', 'drop-off detection', 'win-back automation'],
    existingRoutes: ['/api/crm/capture/leads'],
  },
  {
    id: 'reputation-management',
    name: 'Reputation Management',
    phase: 'evangelize',
    status: 'live',
    domains: ['retention', 'social'],
    description: 'Review and public sentiment management with automation loops.',
    aiAdvancements: ['sentiment monitoring', 'response prioritization', 'reputation alerts'],
    existingRoutes: ['/api/crm/retain/reviews', '/api/crm/retain/reviews/[id]/reply'],
  },
  {
    id: 'automated-review-requests',
    name: 'Automated Review Requests',
    phase: 'evangelize',
    status: 'live',
    domains: ['retention', 'automation'],
    description: 'Automated post-service review request workflows across channels.',
    aiAdvancements: ['timing optimization', 'message personalization', 'completion lift suggestions'],
    existingRoutes: ['/api/crm/retain/reviews/requests'],
  },
  {
    id: 'affiliate-manager',
    name: 'Affiliate Manager (Referral Tracking)',
    phase: 'evangelize',
    status: 'v1',
    domains: ['referrals', 'sales'],
    description: 'Referral and affiliate attribution layer for partner-led acquisition.',
    aiAdvancements: ['partner scoring', 'fraud flags', 'payout optimization'],
    existingRoutes: ['/api/crm/retain/referrals/programs', '/api/crm/retain/referrals/links'],
  },
  {
    id: 'website-review-widgets',
    name: 'Website Review Widgets',
    phase: 'evangelize',
    status: 'planned',
    domains: ['web', 'retention'],
    description: 'Embeddable review widgets for social proof across owned media.',
    aiAdvancements: ['highlight ranking', 'testimonial extraction', 'layout optimization'],
    existingRoutes: ['/api/crm/retain/reviews'],
  },
  {
    id: 'video-review-capture',
    name: 'Video Review Capture',
    phase: 'evangelize',
    status: 'planned',
    domains: ['video', 'retention'],
    description: 'Capture and organize customer video testimonials for trust acceleration.',
    aiAdvancements: ['speech-to-text', 'clip highlights', 'quality scoring'],
    existingRoutes: [],
  },
  {
    id: 'video-review-widgets',
    name: 'Video Review Widgets',
    phase: 'evangelize',
    status: 'planned',
    domains: ['video', 'web'],
    description: 'Embeddable video review experiences for conversion and social proof.',
    aiAdvancements: ['clip recommendation', 'audience matching', 'performance analytics'],
    existingRoutes: [],
  },
  {
    id: 'recommendation-request-automation',
    name: 'Recommendation Request Workflows',
    phase: 'evangelize',
    status: 'v1',
    domains: ['automation', 'retention'],
    description: 'Automated recommendation and referral request workflows for happy customers.',
    aiAdvancements: ['advocate detection', 'timing prediction', 'request personalization'],
    existingRoutes: ['/api/crm/retain/cron/followups', '/api/crm/nurture/workflows/trigger'],
  },
  {
    id: 'ai-review-reply',
    name: 'AI Review Reply',
    phase: 'evangelize',
    status: 'live',
    domains: ['retention', 'ai'],
    description: 'AI-generated review replies with brand-safe tone guidance.',
    aiAdvancements: ['tone control', 'policy-safe response generation', 'context-aware templates'],
    existingRoutes: ['/api/crm/retain/reviews/[id]/reply'],
  },
  {
    id: 'social-planner-auto-review-posts',
    name: 'Social Planner Auto-Review Posts',
    phase: 'evangelize',
    status: 'live',
    domains: ['social', 'retention'],
    description: 'Automatically queue positive reviews into social content plans.',
    aiAdvancements: ['review selection scoring', 'caption generation', 'publish-time optimization'],
    existingRoutes: ['/api/crm/retain/reviews/[id]/social-post'],
  },
  {
    id: 'communities',
    name: 'Communities',
    phase: 'reactivate',
    status: 'v1',
    domains: ['community', 'retention'],
    description: 'Community touchpoints for customer advocacy and reactivation loops.',
    aiAdvancements: ['engagement prompts', 'topic clustering', 'risk flagging'],
    existingRoutes: ['/api/crm/retain/cron/followups'],
  },
  {
    id: 'reactivation-engine',
    name: 'Reactivation Engine',
    phase: 'reactivate',
    status: 'v1',
    domains: ['automation', 'retention'],
    description: 'Re-engagement sequences for dormant leads and past customers.',
    aiAdvancements: ['churn prediction', 'reactivation offer selection', 'channel tuning'],
    existingRoutes: ['/api/crm/retain/cron/followups', '/api/crm/nurture/workflows/trigger'],
  },
  {
    id: 'app-builder',
    name: 'App Builder',
    phase: 'capture',
    status: 'v1',
    domains: ['builder', 'app'],
    description: 'Application module generation with quality gates and architecture templates.',
    aiAdvancements: ['scaffold generation', 'contract validation', 'autonomous refactor passes'],
    existingRoutes: ['/builder', '/devboard?tab=builders&blueprint=app'],
  },
  {
    id: 'website-builder',
    name: 'Website Builder',
    phase: 'capture',
    status: 'v1',
    domains: ['builder', 'web'],
    description: 'Website generation and funnel optimization workflow for demand capture.',
    aiAdvancements: ['section synthesis', 'copy adaptation', 'heatmap-aware optimization'],
    existingRoutes: ['/builder', '/devboard?tab=builders&blueprint=website'],
  },
  {
    id: 'business-builder',
    name: 'Business Builder (SEO and GEO)',
    phase: 'nurture',
    status: 'v1',
    domains: ['builder', 'business', 'marketing'],
    description: 'Business growth engine for SEO, GEO, funnel analytics, and offer optimization.',
    aiAdvancements: ['answer-engine optimization', 'local intent mapping', 'offer experiment design'],
    existingRoutes: ['/builder', '/devboard?tab=builders&blueprint=business'],
  },
  {
    id: 'game-builder-engine',
    name: 'Game Builder Engine',
    phase: 'capture',
    status: 'v1',
    domains: ['builder', 'game'],
    description: 'Game production engine for Roblox and cross-platform marketplace workflows.',
    aiAdvancements: ['game loop generation', 'economy balancing', 'live-ops planning'],
    existingRoutes: ['/builder', '/devboard?tab=builders&blueprint=game'],
  },
  {
    id: 'marketplace-ecosystem',
    name: 'Marketplace Ecosystem',
    phase: 'evangelize',
    status: 'v1',
    domains: ['marketplace', 'builder', 'game'],
    description: 'Template and module marketplace for business, app, website, and game assets.',
    aiAdvancements: ['package scoring', 'creator recommendations', 'monetization analytics'],
    existingRoutes: ['/marketplace'],
  },
];

function normalize(value?: string) {
  return value?.trim().toLowerCase() || '';
}

export function listSystemModules(filter?: SystemCatalogFilter) {
  const search = normalize(filter?.search);

  const phase = filter?.phase;
  const status = filter?.status;
  const domain = normalize(filter?.domain);
  const limit = Math.max(1, Math.min(filter?.limit || CRM_SYSTEM_CATALOG.length, 300));

  return CRM_SYSTEM_CATALOG.filter((system) => {
    if (phase && system.phase !== phase) return false;
    if (status && system.status !== status) return false;
    if (domain && !system.domains.some((item) => normalize(item) === domain)) return false;

    if (search) {
      const haystack = [
        system.id,
        system.name,
        system.description,
        system.phase,
        system.status,
        ...system.domains,
        ...system.aiAdvancements,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    return true;
  }).slice(0, limit);
}

export function summarizeSystemCatalog(systems = CRM_SYSTEM_CATALOG) {
  const byPhase: Record<LifecyclePhase, number> = {
    capture: 0,
    nurture: 0,
    close: 0,
    evangelize: 0,
    reactivate: 0,
  };

  const byStatus: Record<ModuleStatus, number> = {
    live: 0,
    v1: 0,
    planned: 0,
  };

  for (const system of systems) {
    byPhase[system.phase] += 1;
    byStatus[system.status] += 1;
  }

  return {
    total: systems.length,
    byPhase,
    byStatus,
  };
}

function inferPriority(system: CrmSystemModule): 'p0' | 'p1' | 'p2' {
  if (system.status === 'planned') return 'p0';
  if (system.status === 'v1') return 'p1';
  return 'p2';
}

function matchesScope(system: CrmSystemModule, scope: RolloutScope) {
  if (scope === 'all') return true;
  if (scope === 'missing') return system.status !== 'live';
  if (scope === 'game-builder') return system.domains.includes('game') || system.id.includes('game');
  if (scope === 'business-builder') return system.domains.includes('business') || system.id.includes('business');
  if (scope === 'conversation-ai') return system.domains.includes('conversation') || system.domains.includes('ai');
  return system.phase === scope;
}

export function buildRolloutTasks(options?: {
  scope?: RolloutScope;
  limit?: number;
}) {
  const scope = options?.scope || 'missing';
  const limit = Math.max(1, Math.min(options?.limit || 30, 150));

  const targetModules = CRM_SYSTEM_CATALOG
    .filter((system) => matchesScope(system, scope))
    .filter((system) => scope === 'all' || system.status !== 'live')
    .slice(0, limit);

  const tasks: RolloutTask[] = targetModules.map((system) => {
    const keyAiAdvancements = system.aiAdvancements.slice(0, 2).join(', ');
    const routeHint = system.existingRoutes.length > 0
      ? `Integrate with: ${system.existingRoutes.join(', ')}`
      : 'Create fresh module endpoints and workflow hooks.';

    return {
      moduleId: system.id,
      moduleName: system.name,
      phase: system.phase,
      priority: inferPriority(system),
      type: 'feature',
      description: `Implement ${system.name} (${system.phase}). ${system.description} AI focus: ${keyAiAdvancements}. ${routeHint}`,
    };
  });

  return {
    scope,
    totalTasks: tasks.length,
    tasks,
    modules: targetModules,
  };
}
