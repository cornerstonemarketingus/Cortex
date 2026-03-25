import { ApiError } from './api';
import { getOpenAiApiKey, getOpenAiModel, getCrmRateLimitRpm } from './env';

export type AiRole = 'system' | 'user' | 'assistant';

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type ConversationTone = 'friendly' | 'sales' | 'support';

const OPENAI_BASE_URL = 'https://api.openai.com/v1/chat/completions';

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

export async function callOpenAiChat(
  messages: AiMessage[],
  tone: ConversationTone,
  maxRetries = 3
): Promise<string> {
  const apiKey = getOpenAiApiKey();

  // Fallback keeps workflows operational in local/dev when key is missing.
  if (!apiKey) {
    const userText = latestUserMessage(messages);
    return `Auto-reply (${tone}): Received "${userText}". A team member will follow up shortly.`;
  }

  const requestMessages: AiMessage[] = [
    {
      role: 'system',
      content: getTonePrompt(tone),
    },
    ...messages,
  ];

  let attempt = 0;
  let lastError = 'Unknown OpenAI error';

  while (attempt < maxRetries) {
    attempt += 1;

    await limiter.acquire();

    try {
      const response = await fetch(OPENAI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: getOpenAiModel(),
          temperature: 0.4,
          messages: requestMessages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = `OpenAI ${response.status}: ${errorBody}`;

        if (response.status >= 500 || response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)));
          continue;
        }

        throw new ApiError(502, 'OpenAI request failed', 'OPENAI_ERROR', {
          status: response.status,
          body: errorBody,
        });
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new ApiError(502, 'OpenAI returned an empty response', 'OPENAI_EMPTY_RESPONSE');
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

  throw new ApiError(502, 'OpenAI request failed after retries', 'OPENAI_RETRY_EXHAUSTED', {
    lastError,
  });
}
