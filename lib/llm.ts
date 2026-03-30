// Unified LLM caller with structured output support
export interface LLMCallOptions {
  system: string;
  user: string;
  temperature?: number;
  json?: boolean;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  parsed?: any;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export async function callLLM(options: LLMCallOptions): Promise<LLMResponse> {
  const { system, user, temperature = 0, json = false, maxTokens = 2000 } = options;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'assistant',
        provider: 'auto',
        tone: 'technical',
        systemPrompt: system,
        message: user,
        temperature,
        maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }

    const data = (await response.json().catch(() => ({}))) as any;
    const text = Array.isArray(data.responses) ? data.responses[0] : data.results?.[0]?.result || '';

    return {
      text,
      parsed: json ? tryParseJSON(text) : undefined,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
      },
    };
  } catch (error) {
    console.error('LLM call failed:', error);
    throw error;
  }
}

function tryParseJSON(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export default { callLLM };
