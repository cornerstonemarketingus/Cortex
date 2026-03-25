import { ApiError, readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, parseBoolean, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { BLOG_REGIONS, createBlogPost, type BlogRegion } from '@/src/content/blog-engine';
import { appendTaskDrafts } from '@/src/cto/taskQueue';
import { buildPrompt } from '@/src/platform/prompt-engineering';
import { callOpenAiChat } from '@/src/crm/core/openai';
import { requireTenantContext } from '@/src/platform/tenant-enforcement';
import { consumePromptCredits } from '@/src/billing/subscription.service';

type GrowthBody = {
  topic?: unknown;
  region?: unknown;
  cityFocus?: unknown;
  primaryKeyword?: unknown;
  callToAction?: unknown;
  improveCommunication?: unknown;
  enqueueDevTasks?: unknown;
  tenantId?: unknown;
  subscriberEmail?: unknown;
};

function parseCityFocus(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 10);
}

function parseRegion(value: string | undefined): BlogRegion {
  const normalized = (value || '').trim().toLowerCase();
  return BLOG_REGIONS.includes(normalized as BlogRegion)
    ? (normalized as BlogRegion)
    : 'global';
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const body = await readJson<GrowthBody>(request);
    const tenant = requireTenantContext(request, {
      claims: auth,
      bodyTenantId: body.tenantId,
      required: true,
    });

    const subscriberEmail = parseOptionalString(body.subscriberEmail);
    if (!subscriberEmail) {
      throw new ApiError(400, 'subscriberEmail is required for growth prompt credit metering', 'SUBSCRIBER_EMAIL_REQUIRED');
    }

    const topic = parseOptionalString(body.topic) || 'How to choose a trustworthy local contractor for your project';
    const region = parseRegion(parseOptionalString(body.region));
    const cityFocus = parseCityFocus(body.cityFocus);

    const post = await createBlogPost({
      topic,
      region,
      cityFocus,
      primaryKeyword: parseOptionalString(body.primaryKeyword) || 'local contractor estimate',
      callToAction: parseOptionalString(body.callToAction) || 'Request your project estimate today.',
      tone: 'sales',
      style: 'conversion-brief',
    });

    const postUsage = await consumePromptCredits({
      email: subscriberEmail,
      units: Math.max(1, Math.ceil((post.content.articleMarkdown.length + topic.length) / 1500)),
      context: {
        operation: 'platform-growth-blog',
        tenantId: tenant.tenantId,
        region,
        postId: post.id,
      },
    });

    let communicationPlan: string | null = null;
    let communicationUsage: Awaited<ReturnType<typeof consumePromptCredits>> | null = null;
    if (parseBoolean(body.improveCommunication, true)) {
      const prompt = buildPrompt({
        mode: 'agent-system',
        objective: 'Improve AI bot communication quality for inbound leads and service follow-up.',
        audience: 'contractor operations team',
        constraints: [
          'Output exactly 5 improvements.',
          'Each item must include: what, why, and measurable KPI.',
        ],
        facts: {
          postSlug: post.seo.slug,
          region,
          cityFocus,
        },
      });

      communicationPlan = await callOpenAiChat(
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.content },
        ],
        'support'
      );

      communicationUsage = await consumePromptCredits({
        email: subscriberEmail,
        units: Math.max(1, Math.ceil((prompt.system.length + prompt.content.length + communicationPlan.length) / 900)),
        context: {
          operation: 'platform-growth-communication',
          tenantId: tenant.tenantId,
          postId: post.id,
          region,
        },
      });
    }

    let queued = null as null | { added: number; total: number };
    if (parseBoolean(body.enqueueDevTasks, true)) {
      const appendResult = await appendTaskDrafts(
        [
          {
            type: 'feature',
            description: `[Growth Autopilot] Publish and distribute SEO post ${post.seo.slug}`,
            metadata: {
              pipeline: 'growth-autopilot',
              postId: post.id,
            },
          },
          {
            type: 'feature',
            description: `[Growth Autopilot] Improve bot communication prompts for ${region}`,
            metadata: {
              pipeline: 'growth-autopilot',
              focus: 'ai-communication',
            },
          },
        ],
        {
          dedupeByDescription: true,
          idPrefix: 'growth',
        }
      );

      queued = {
        added: appendResult.added.length,
        total: appendResult.total,
      };
    }

    return jsonResponse({
      ok: true,
      tenantId: tenant.tenantId,
      post,
      communicationPlan,
      usage: {
        post: postUsage,
        communication: communicationUsage,
      },
      queued,
    }, 201);
  });
}
