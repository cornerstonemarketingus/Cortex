import {
  CRM_SYSTEM_CATALOG,
  CUSTOMER_LIFECYCLE,
  summarizeSystemCatalog,
} from '../src/crm/modules/platform/system-catalog';

type AuditIssue = {
  severity: 'error' | 'warning';
  message: string;
};

const requiredSystemIds = [
  'ai-crm-core',
  'voice-ai',
  'forms-surveys-quizzes',
  'websites-funnels-landing-pages',
  'chat-widget-conversation-ai',
  'call-tracking',
  'inbound-sms-social-dms',
  'social-planner',
  'missed-call-text-back',
  'ai-biz-card-scanner',
  'qr-codes',
  'prospecting-tool',
  'ad-manager-ai',
  'consolidated-conversation-stream',
  'sales-pipelines',
  'workflows-automations',
  'calendars',
  'text-snippets',
  'appointment-reminders',
  'ringless-voicemail',
  'mobile-app-video-messages',
  'outbound-call-connect',
  'lead-scoring',
  'estimates-proposals',
  'invoicing',
  'payment-integrations',
  'paid-calendars',
  'order-forms-upsells-downsells',
  'membership-offers-courses',
  'one-click-upsell-funnels',
  'text-to-pay',
  'tap-to-pay',
  'gift-cards',
  'loyalty-programs',
  'reputation-management',
  'automated-review-requests',
  'affiliate-manager',
  'website-review-widgets',
  'video-review-capture',
  'video-review-widgets',
  'recommendation-request-automation',
  'ai-review-reply',
  'social-planner-auto-review-posts',
  'communities',
  'app-builder',
  'website-builder',
  'business-builder',
  'game-builder-engine',
  'marketplace-ecosystem',
];

const issues: AuditIssue[] = [];
const availableIds = new Set(CRM_SYSTEM_CATALOG.map((module) => module.id));

for (const requiredId of requiredSystemIds) {
  if (!availableIds.has(requiredId)) {
    issues.push({
      severity: 'error',
      message: `Missing required system module: ${requiredId}`,
    });
  }
}

for (const phase of CUSTOMER_LIFECYCLE) {
  const hasPhaseModule = CRM_SYSTEM_CATALOG.some((system) => system.phase === phase);
  if (!hasPhaseModule) {
    issues.push({
      severity: 'error',
      message: `Lifecycle coverage missing phase: ${phase}`,
    });
  }
}

for (const system of CRM_SYSTEM_CATALOG) {
  if (system.aiAdvancements.length < 2) {
    issues.push({
      severity: 'warning',
      message: `Module has weak AI depth: ${system.id}`,
    });
  }

  if (system.description.trim().length < 20) {
    issues.push({
      severity: 'warning',
      message: `Module description too short: ${system.id}`,
    });
  }
}

const summary = summarizeSystemCatalog(CRM_SYSTEM_CATALOG);
const errorCount = issues.filter((issue) => issue.severity === 'error').length;
const warningCount = issues.filter((issue) => issue.severity === 'warning').length;

console.log(
  JSON.stringify(
    {
      status: errorCount === 0 ? 'pass' : 'fail',
      summary: {
        totalModules: summary.total,
        lifecycleCoverage: summary.byPhase,
        statusCoverage: summary.byStatus,
        requiredModuleCount: requiredSystemIds.length,
        errorCount,
        warningCount,
      },
      issues,
    },
    null,
    2
  )
);

if (errorCount > 0) {
  process.exit(1);
}
