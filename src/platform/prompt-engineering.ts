export type PromptMode =
  | 'sms-reply'
  | 'chat-reply'
  | 'blog-seo-geo'
  | 'review-approval'
  | 'agent-system';

export type PromptBuildInput = {
  mode: PromptMode;
  objective: string;
  audience?: string;
  locale?: string;
  constraints?: string[];
  facts?: Record<string, unknown>;
};

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function modeSystemPrompt(mode: PromptMode): string {
  if (mode === 'sms-reply') {
    return 'You are an SMS automation assistant. Write concise, plain-language replies with one clear CTA and no fluff.';
  }
  if (mode === 'chat-reply') {
    return 'You are a CRM chat assistant. Ask one clarifying question when needed and keep replies concise, human, and action-oriented.';
  }
  if (mode === 'blog-seo-geo') {
    return 'You are an SEO + local GEO content strategist. Write location-aware, intent-focused content with practical CTAs and factual tone.';
  }
  if (mode === 'review-approval') {
    return 'You are a compliance and quality reviewer. Return pass/fail reasoning with specific revision advice.';
  }
  return 'You are a software automation orchestrator. Produce deterministic, structured output and avoid hallucinations.';
}

export function buildPrompt(input: PromptBuildInput) {
  const constraints = (input.constraints || []).filter((item) => item.trim().length > 0);
  const facts = input.facts || {};

  const factLines = Object.entries(facts)
    .map(([key, value]) => `- ${key}: ${asString(value)}`)
    .filter((line) => line.trim().length > 0)
    .slice(0, 20);

  const content = [
    `Objective: ${input.objective.trim()}`,
    `Audience: ${input.audience?.trim() || 'General user'}`,
    `Locale: ${input.locale?.trim() || 'US'}`,
    constraints.length > 0 ? `Constraints:\n${constraints.map((item) => `- ${item}`).join('\n')}` : null,
    factLines.length > 0 ? `Known facts:\n${factLines.join('\n')}` : null,
    'Output requirements:',
    '- Keep answer concise and practical.',
    '- Prefer deterministic structure over creative variance.',
    '- If data is missing, ask exactly one clarifying question.',
  ]
    .filter((line): line is string => Boolean(line && line.trim().length > 0))
    .join('\n\n');

  return {
    system: modeSystemPrompt(input.mode),
    content,
  };
}
