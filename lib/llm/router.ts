/**
 * LLM Router — Multi-model orchestration layer
 * Routes prompts to the best model based on task type, cost, and availability.
 * Provider: Primary AI, Local (fast/private)
 */

export type LLMTask =
  | 'code'
  | 'reasoning'
  | 'estimate'
  | 'voice'
  | 'chat'
  | 'builder'
  | 'automation'
  | 'seo'
  | 'fast';

export type LLMProvider = 'primary' | 'local';

export interface LLMRequest {
  task: LLMTask;
  prompt: string;
  systemPrompt?: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  model: string;
  tokensUsed?: number;
}

const LLM_HTTP_TIMEOUT_MS = Number(process.env.LLM_HTTP_TIMEOUT_MS || 20_000);

const MODEL_ROUTING: Record<LLMTask, LLMProvider> = {
  code: 'primary',
  builder: 'primary',
  estimate: 'primary',
  seo: 'primary',
  reasoning: 'primary',
  automation: 'primary',
  voice: 'primary',
  chat: 'primary',
  fast: 'local',
};

function detectTask(prompt: string): LLMTask {
  const lower = prompt.toLowerCase();
  if (/function|component|code|typescript|javascript|class|interface/.test(lower)) return 'code';
  if (/estimate|quote|bid|material|labor|sqft|square/.test(lower)) return 'estimate';
  if (/if.*then|workflow|trigger|automate|when.*do/.test(lower)) return 'automation';
  if (/hero|section|page|website|builder|layout|design/.test(lower)) return 'builder';
  if (/seo|meta|title|description|keyword/.test(lower)) return 'seo';
  if (/why|analyze|reason|explain|compare|strategy/.test(lower)) return 'reasoning';
  return 'chat';
}

export function selectProvider(task: LLMTask): LLMProvider {
  const override = process.env.LLM_PROVIDER_OVERRIDE as LLMProvider | undefined;
  if (override) return override;
  return MODEL_ROUTING[task] ?? 'primary';
}

type AiProvider = 'anthropic' | 'openai';

function resolveAiCredentials(): { apiKey: string; apiUrl: string; model: string; provider: AiProvider } | null {
  // Explicit generic vars take priority, then provider-specific vars.
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    '';

  if (!apiKey) return null;

  // Determine which provider the key belongs to so we can set correct defaults.
  const isOpenAi =
    !process.env.AI_API_KEY && !process.env.ANTHROPIC_API_KEY && !!process.env.OPENAI_API_KEY;
  const provider: AiProvider = isOpenAi ? 'openai' : 'anthropic';

  const defaultUrl = isOpenAi
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.anthropic.com/v1/messages';

  const defaultModel = isOpenAi ? 'gpt-4o' : 'claude-3-5-sonnet-20241022';

  return {
    apiKey,
    apiUrl: process.env.AI_API_URL || defaultUrl,
    model: process.env.AI_MODEL || defaultModel,
    provider,
  };
}

async function callAi(req: LLMRequest): Promise<LLMResponse> {
  const creds = resolveAiCredentials();
  if (!creds) return localFallback(req);

  const { apiKey, apiUrl, model, provider } = creds;

  let body: Record<string, unknown>;
  let headers: Record<string, string>;

  if (provider === 'openai') {
    const messages: Array<{ role: string; content: string }> = [];
    if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt });
    messages.push({ role: 'user', content: req.prompt });
    body = {
      model,
      max_tokens: req.maxTokens ?? 4096,
      messages,
    };
    headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    };
  } else {
    body = {
      model,
      max_tokens: req.maxTokens ?? 4096,
      messages: [{ role: 'user', content: req.prompt }],
    };
    if (req.systemPrompt) body.system = req.systemPrompt;
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_HTTP_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) return localFallback(req);

  const data = await res.json() as {
    content?: Array<{ text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
    };
  };

  const text =
    data.content?.[0]?.text ??
    data.choices?.[0]?.message?.content ??
    '';

  const tokensUsed =
    (data.usage?.input_tokens ?? data.usage?.prompt_tokens ?? 0) +
    (data.usage?.output_tokens ?? data.usage?.completion_tokens ?? 0);

  return {
    text,
    provider: 'primary',
    model,
    tokensUsed,
  };
}

function localFallback(req: LLMRequest): LLMResponse {
  console.warn(`[LLM Router] Falling back to local for task "${req.task}". Configure AI_API_KEY (or OPENAI_API_KEY / ANTHROPIC_API_KEY) and AI_API_URL for full AI responses.`);
  return {
    text: '',
    provider: 'local',
    model: 'local-fallback',
  };
}

/**
 * Primary router — call with any LLM request.
 * Auto-detects task from prompt if not specified.
 */
export async function routeLLM(req: LLMRequest): Promise<LLMResponse> {
  const prompt = (req.prompt || '').trim();
  if (!prompt) {
    return {
      text: '',
      provider: 'local',
      model: 'local-guardrail',
    };
  }

  const safeReq: LLMRequest = {
    ...req,
    prompt: prompt.slice(0, 12_000),
    maxTokens: req.maxTokens ? Math.min(Math.max(req.maxTokens, 64), 4_096) : undefined,
    temperature: typeof req.temperature === 'number'
      ? Math.min(Math.max(req.temperature, 0), 1)
      : undefined,
  };

  const task = safeReq.task ?? detectTask(safeReq.prompt);
  const provider = selectProvider(task);

  try {
    if (provider === 'local') return localFallback({ ...safeReq, task });
    return await callAi({ ...safeReq, task });
  } catch {
    return localFallback({ ...safeReq, task });
  }
}

/**
 * Convenience: route and return just the text string.
 * Throws if the AI service is unavailable so callers can fall back gracefully.
 */
export async function llm(prompt: string, task?: LLMTask, systemPrompt?: string): Promise<string> {
  const result = await routeLLM({ prompt, task: task ?? detectTask(prompt), systemPrompt });
  if (result.provider === 'local') {
    throw new Error('AI service unavailable');
  }
  return result.text;
}
