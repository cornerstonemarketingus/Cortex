/**
 * LLM Router — Multi-model orchestration layer
 * Routes prompts to the best model based on task type, cost, and availability.
 * Provider: Claude (Anthropic), Local (fast/private)
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

export type LLMProvider = 'claude' | 'local';

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
  code: 'claude',
  builder: 'claude',
  estimate: 'claude',
  seo: 'claude',
  reasoning: 'claude',
  automation: 'claude',
  voice: 'claude',
  chat: 'claude',
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
  return MODEL_ROUTING[task] ?? 'claude';
}

async function callClaude(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return localFallback(req);

  const model = process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022';
  const body: Record<string, unknown> = {
    model,
    max_tokens: req.maxTokens ?? 4096,
    messages: [{ role: 'user', content: req.prompt }],
  };
  if (req.systemPrompt) body.system = req.systemPrompt;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_HTTP_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) return localFallback(req);

  const data = await res.json() as {
    content?: Array<{ text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = data.content?.[0]?.text ?? '';
  return {
    text,
    provider: 'claude',
    model,
    tokensUsed: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
  };
}

function localFallback(req: LLMRequest): LLMResponse {
  return {
    text: `[Local model] Received task "${req.task}". Configure ANTHROPIC_API_KEY for full AI responses.`,
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
      text: '[Local model] Empty prompt received. Please provide a request.',
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
    return await callClaude({ ...safeReq, task });
  } catch {
    return localFallback({ ...safeReq, task });
  }
}

/**
 * Convenience: route and return just the text string.
 */
export async function llm(prompt: string, task?: LLMTask, systemPrompt?: string): Promise<string> {
  const result = await routeLLM({ prompt, task: task ?? detectTask(prompt), systemPrompt });
  return result.text;
}
