/**
 * LLM Router — Multi-model orchestration layer
 * Routes prompts to the best model based on task type, cost, and availability.
 * Providers: OpenAI (code/structured), Claude (reasoning/long-form), Local (fast/private)
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

export type LLMProvider = 'openai' | 'claude' | 'local';

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
  code: 'openai',
  builder: 'openai',
  estimate: 'openai',
  seo: 'openai',
  reasoning: 'claude',
  automation: 'claude',
  voice: 'openai',
  chat: 'openai',
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
  return MODEL_ROUTING[task] ?? 'openai';
}

async function callOpenAI(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return localFallback(req);

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const messages: Array<{ role: string; content: string }> = [];

  if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt });
  messages.push({ role: 'user', content: req.prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_HTTP_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: req.maxTokens ?? 2000,
        temperature: req.temperature ?? 0.7,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) return localFallback(req);

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  return {
    text,
    provider: 'openai',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callClaude(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return callOpenAI({ ...req, task: 'chat' }); // graceful fallback

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

  if (!res.ok) return callOpenAI(req);

  const data = await res.json() as {
    content?: Array<{ text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = data.content?.[0]?.text ?? '';
  return {
    text,
    provider: 'claude',
    model,
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
  };
}

function localFallback(req: LLMRequest): LLMResponse {
  if (req.task === 'estimate') {
    // Parse estimate prompt for key details
    const tradesMatch = req.prompt.match(/Trades: (.*?)\\./i) || req.prompt.match(/trades?:? (.*?)\\./i);
    const trades = tradesMatch ? tradesMatch[1].trim() : 'project trades';
    const totalMatch = req.prompt.match(/Total: \\$(\\d+(?:,\\d{3})*)/i);
    const total = totalMatch ? totalMatch[1] : '$XX,XXX';
    const sqftMatch = req.prompt.match(/Square footage: (\\d+)/i);
    const sqft = sqftMatch ? sqftMatch[1] : 'X,XXX';
    
    return {
      text: `Professional construction estimate summary:\\n\\n**Total Project Cost: ${total}**\\n**Scope: ${sqft} sqft, ${trades}**\\n\\nThis bid includes complete material, labor, overhead (12%), tax (7%), and profit (18%). Timeline: 2-4 weeks typical. Valid 30 days. Questions? Call for detailed takeoff.`,
      provider: 'local',
      model: 'estimator-local',
    };
  }
  
  return {
    text: `[Local model] Received task "${req.task}". Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for full AI responses.`,
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
    if (provider === 'claude') return await callClaude({ ...safeReq, task });
    if (provider === 'local') return localFallback({ ...safeReq, task });
    return await callOpenAI({ ...safeReq, task });
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
