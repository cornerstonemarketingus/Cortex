import { ApiError } from './api';
import { getCrmRateLimitRpm } from './env';

export type AiRole = 'system' | 'user' | 'assistant';

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type ConversationTone = 'friendly' | 'sales' | 'support';

const AI_BASE_URL = process.env.AI_API_URL ?? '';

class FixedWindowRateLimiter {
  private readonly requestsPerWindow: number;
  private readonly windowMs: number;
  private windowStartedAt = 0;
  private count = 0;

  constructor(requestsPerWindow: number, windowMs: number) {
    this.requestsPerWindow = requestsPerWindow;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    if (this.windowStartedAt === 0 || now - this.windowStartedAt >= this.windowMs) {
      this.windowStartedAt = now;
      this.count = 0;
    }

    if (this.count < this.requestsPerWindow) {
      this.count += 1;
      return;
    }

    const waitMs = this.windowMs - (now - this.windowStartedAt) + 25;
    await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 25)));
    await this.acquire();
  }
}

const limiter = new FixedWindowRateLimiter(getCrmRateLimitRpm(), 60_000);

function getTonePrompt(tone: ConversationTone) {
  if (tone === 'sales') {
    return 'You are a concise sales assistant. Prioritize conversion and next steps without being pushy.';
  }

  if (tone === 'support') {
    return 'You are a support assistant. Prioritize empathy, clarity, and actionable troubleshooting.';
  }

  return 'You are a friendly CRM assistant. Be clear, warm, and concise.';
}

function latestUserMessage(messages: AiMessage[]): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) return 'Thanks for your message. How can I help next?';
  return userMessages[userMessages.length - 1]?.content || 'Thanks for your message.';
}

export async function callAiChat(
  messages: AiMessage[],
  tone: ConversationTone,
  maxRetries = 3
): Promise<string> {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new ApiError(503, 'AI service is not configured.', 'AI_NOT_CONFIGURED');
  }

  const model = process.env.AI_MODEL ?? '';

  const systemMessage = getTonePrompt(tone);
  const aiMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  let attempt = 0;
  let lastError = 'Unknown AI error';

  while (attempt < maxRetries) {
    attempt += 1;

    await limiter.acquire();

    try {
      const response = await fetch(AI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          model,
          system: systemMessage,
          max_tokens: 1024,
          messages: aiMessages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = `AI ${response.status}: ${errorBody}`;

        if (response.status >= 500 || response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)));
          continue;
        }

        throw new ApiError(502, 'AI request failed', 'AI_ERROR', {
          status: response.status,
          body: errorBody,
        });
      }

      const payload = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };

      const content = payload.content?.[0]?.text?.trim();
      if (!content) {
        throw new ApiError(502, 'AI returned an empty response', 'AI_EMPTY_RESPONSE');
      }

      return content;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)));
      }
    }
  }

  throw new ApiError(502, 'AI request failed after retries', 'AI_RETRY_EXHAUSTED', {
    lastError,
  });
}
