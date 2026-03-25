export type BotDefinition = {
  id: number;
  name: string;
  role: string;
  description: string;
  style: string;
};

export const BOT_DEFINITIONS: BotDefinition[] = [
  { id: 1, name: 'Planner', role: 'Planning Lead', description: 'Breaks initiatives into milestones, owners, and delivery sequence.', style: 'structured' },
  { id: 2, name: 'Backend Engineer', role: 'Backend Engineer', description: 'APIs, data contracts, integrations, and reliability tuning.', style: 'technical' },
  { id: 3, name: 'Frontend Engineer', role: 'Frontend Engineer', description: 'High-end UX execution, performance, and interaction quality.', style: 'visual-technical' },
  { id: 4, name: 'Automation AI Agent', role: 'Automation Architect', description: 'Designs AI workflows, triggers, and autonomous execution loops.', style: 'automation' },
  { id: 5, name: 'QA Debugger', role: 'QA and Debug Lead', description: 'Regression prevention, edge-case validation, and test hardening.', style: 'quality' },
  { id: 6, name: 'DevOps Engineer', role: 'DevOps Engineer (Optional)', description: 'Release pipelines, environment safety, and deployment reliability.', style: 'operations' },
  { id: 7, name: 'Growth Marketer', role: 'Growth Marketer', description: 'Positioning, channels, and conversion loop design.', style: 'growth' },
  { id: 8, name: 'SEO GEO Specialist', role: 'SEO and GEO Specialist', description: 'Local-service visibility, topical authority, and search capture.', style: 'search-focused' },
  { id: 9, name: 'Voice AI Receptionist Architect', role: 'Voice Receptionist Architect', description: 'Call handling, missed-call recovery, and voice-to-CRM routing.', style: 'voice-ops' },
  { id: 10, name: 'CRM Lifecycle Manager', role: 'CRM Lifecycle Manager', description: 'Lead nurture, close workflows, and retention automations.', style: 'lifecycle' },
  { id: 11, name: 'Business Analyst', role: 'Business Analyst', description: 'KPI dashboards, benchmarks, and decision metrics.', style: 'metric-driven' },
  { id: 12, name: 'Launch Strategist', role: 'Launch Strategist', description: 'Go-to-market planning, roadmap sequencing, and launch readiness.', style: 'forward-looking' },
];

export const MESSAGE_MAX_CHARS = 4_000;

export function normalizeBotIds(botIds: unknown): number[] {
  if (!Array.isArray(botIds)) return [];
  const maxId = BOT_DEFINITIONS.length;
  const normalized = botIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id >= 1 && id <= maxId);
  return Array.from(new Set(normalized));
}

export function sanitizePrompt(input: unknown): string {
  if (typeof input !== 'string') return '';

  const trimmed = input.trim();
  if (!trimmed) return '';

  if (trimmed.length > MESSAGE_MAX_CHARS) {
    return trimmed.slice(0, MESSAGE_MAX_CHARS);
  }

  return trimmed;
}

export function buildRoleResponse(botName: string, prompt: string): string {
  const isGreeting = /^(hi|hello|hey)\b/i.test(prompt.trim());

  switch (botName) {
    case 'Planner':
      return isGreeting
        ? 'Planner: Ready. Share your business objective, constraints, and timeline, and I will break work into executable milestones.'
        : `Planner execution map for "${prompt}": 1) lock target KPI and deadline, 2) split into scoped workstreams, 3) assign owner by role, 4) stage launch and QA gates.`;
    case 'Backend Engineer':
      return `Backend Engineer plan for "${prompt}": define API contracts, validate payload boundaries, optimize data flow, and enforce resilient error handling with observability.`;
    case 'Frontend Engineer':
      return `Frontend Engineer pass for "${prompt}": streamline user path, improve perceived quality, optimize render performance, and maintain accessibility with clear UI states.`;
    case 'Automation AI Agent':
      return `Automation AI Agent blueprint for "${prompt}": design trigger map, context memory loop, handoff rules, fallback logic, and measurable automation outcomes.`;
    case 'QA Debugger':
      return `QA Debugger checklist for "${prompt}": reproduce baseline, add regression tests, inspect edge cases, run build checks, and verify no UX or API regressions.`;
    case 'DevOps Engineer':
      return `DevOps Engineer runbook for "${prompt}": enforce environment parity, secure secrets, automate deploy checks, and set rollback and alerting thresholds.`;
    case 'Growth Marketer':
      return `Growth Marketer strategy for "${prompt}": segment ICP, align offer to intent stage, deploy conversion assets, and run weekly optimization cycles.`;
    case 'SEO GEO Specialist':
      return `SEO/GEO Specialist plan for "${prompt}": map local intent clusters, build service-area pages, optimize GBP + citations, and track ranking-to-lead conversion.`;
    case 'Voice AI Receptionist Architect':
      return `Voice AI Receptionist architecture for "${prompt}": call routing tree, missed-call text-back, qualification script, and CRM auto-log with follow-up sequence.`;
    case 'CRM Lifecycle Manager':
      return `CRM Lifecycle flow for "${prompt}": automate capture, nurture, close, referral, and reactivation stages with lead scoring and SLA alerts.`;
    case 'Business Analyst':
      return `Business Analyst scorecard for "${prompt}": baseline KPIs, expected lift ranges, experiment cadence, and decision thresholds for scale or rollback.`;
    case 'Launch Strategist':
      return `Launch Strategist roadmap for "${prompt}": sequence pre-launch validation, publish assets, activate campaigns, and run a 30/60/90-day improvement plan.`;
    default:
      return `Agent perspective on "${prompt}": clarify your goal and constraints for a sharper recommendation.`;
  }
}
