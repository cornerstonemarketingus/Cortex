import { crmDb } from '@/src/crm/core/crmDb';

export type AutomationTemplateKey =
  | 'instantLeadReply'
  | 'missedCallTextBack'
  | 'stageFollowup'
  | 'reviewRequest'
  | 'reengagement';

export type AutomationTemplateMap = Record<AutomationTemplateKey, string>;

const TEMPLATE_PREFIX = 'Template:';

const DEFAULT_TEMPLATES: AutomationTemplateMap = {
  instantLeadReply:
    'Thanks for reaching out. We received your request and will follow up with estimate and scheduling options shortly.',
  missedCallTextBack: 'Sorry we missed your call. Want to book a quick callback?',
  stageFollowup: 'Quick check-in: want to keep your project moving this week?',
  reviewRequest: 'Thanks for your business. Could you share a quick review about your experience?',
  reengagement:
    'Quick re-connect: we have open install slots this month and updated financing options. Want a refreshed quote?',
};

function toKeyFromName(name: string): AutomationTemplateKey | null {
  if (!name.startsWith(TEMPLATE_PREFIX)) return null;
  const raw = name.slice(TEMPLATE_PREFIX.length).trim();
  if (raw === 'instantLeadReply') return 'instantLeadReply';
  if (raw === 'missedCallTextBack') return 'missedCallTextBack';
  if (raw === 'stageFollowup') return 'stageFollowup';
  if (raw === 'reviewRequest') return 'reviewRequest';
  if (raw === 'reengagement') return 'reengagement';
  return null;
}

function toTemplateName(key: AutomationTemplateKey) {
  return `${TEMPLATE_PREFIX} ${key}`;
}

function sanitizeTemplate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, 800);
}

export function getDefaultAutomationTemplates(): AutomationTemplateMap {
  return { ...DEFAULT_TEMPLATES };
}

export async function getAutomationTemplates(): Promise<AutomationTemplateMap> {
  const defaults = getDefaultAutomationTemplates();
  const stored = await crmDb.workflow.findMany({
    where: {
      triggerType: 'template',
      name: {
        startsWith: TEMPLATE_PREFIX,
      },
    },
  });

  for (const entry of stored) {
    const key = toKeyFromName(entry.name);
    if (!key) continue;

    const definition = entry.definitionJson as { content?: unknown } | null;
    if (definition && typeof definition.content === 'string') {
      const content = sanitizeTemplate(definition.content);
      if (content) {
        defaults[key] = content;
      }
    }
  }

  return defaults;
}

export async function saveAutomationTemplates(
  updates: Partial<AutomationTemplateMap>
): Promise<AutomationTemplateMap> {
  const current = await getAutomationTemplates();

  const entries = Object.entries(updates) as Array<[AutomationTemplateKey, string]>;
  for (const [key, value] of entries) {
    if (typeof value !== 'string') continue;
    const sanitized = sanitizeTemplate(value);
    if (!sanitized) continue;

    current[key] = sanitized;

    const name = toTemplateName(key);
    const existing = await crmDb.workflow.findFirst({
      where: {
        triggerType: 'template',
        name,
      },
    });

    if (existing) {
      await crmDb.workflow.update({
        where: { id: existing.id },
        data: {
          definitionJson: {
            key,
            content: sanitized,
            updatedAt: new Date().toISOString(),
          },
          isActive: true,
        },
      });
    } else {
      await crmDb.workflow.create({
        data: {
          name,
          triggerType: 'template',
          definitionJson: {
            key,
            content: sanitized,
            updatedAt: new Date().toISOString(),
          },
          isActive: true,
        },
      });
    }
  }

  return current;
}
