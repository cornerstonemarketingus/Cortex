import { ApiError, readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, parseOptionalString, parseRecord, withApiHandler } from '@/src/crm/core/http';
import { callOpenAiChat } from '@/src/crm/core/openai';
import { buildPrompt, type PromptMode } from '@/src/platform/prompt-engineering';
import { requireTenantContext } from '@/src/platform/tenant-enforcement';
import { consumePromptCredits } from '@/src/billing/subscription.service';

type RespondBody = {
  mode?: unknown;
  objective?: unknown;
  audience?: unknown;
  locale?: unknown;
  constraints?: unknown;
  facts?: unknown;
  subscriberEmail?: unknown;
  tenantId?: unknown;
};

function parseMode(value: unknown): PromptMode {
  if (value === 'sms-reply' || value === 'chat-reply' || value === 'blog-seo-geo' || value === 'review-approval' || value === 'agent-system') {
    return value;
  }
  return 'agent-system';
}

function parseConstraints(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 20);
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 20);
  }

  return [];
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const body = await readJson<RespondBody>(request);
    const tenant = requireTenantContext(request, {
      claims: auth,
      bodyTenantId: body.tenantId,
      required: true,
    });

    const objective = parseOptionalString(body.objective);
    const subscriberEmail = parseOptionalString(body.subscriberEmail);

    if (!objective) {
      throw new ApiError(400, 'objective is required', 'OBJECTIVE_REQUIRED');
    }
    if (!subscriberEmail) {
      throw new ApiError(400, 'subscriberEmail is required for prompt credit metering', 'SUBSCRIBER_EMAIL_REQUIRED');
    }

    const prompt = buildPrompt({
      mode: parseMode(body.mode),
      objective,
      audience: parseOptionalString(body.audience),
      locale: parseOptionalString(body.locale),
      constraints: parseConstraints(body.constraints),
      facts: parseRecord(body.facts),
    });

    const response = await callOpenAiChat(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.content },
      ],
      'sales'
    );

    const usage = await consumePromptCredits({
      email: subscriberEmail,
      units: Math.max(1, Math.ceil((prompt.system.length + prompt.content.length + response.length) / 900)),
      context: {
        operation: 'platform-ai-respond',
        tenantId: tenant.tenantId,
        mode: parseMode(body.mode),
      },
    });

    return jsonResponse({
      tenantId: tenant.tenantId,
      prompt,
      response,
      usage,
    });
  });
}
