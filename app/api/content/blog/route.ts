import { ApiError, readJson } from '@/src/crm/core/api';
import {
  jsonResponse,
  parseBoolean,
  parseLimit,
  parseOptionalString,
  parseStringArray,
  withApiHandler,
} from '@/src/crm/core/http';
import { appendTaskDrafts } from '@/src/cto/taskQueue';
import { requireOperatorAccess } from '@/src/security/operatorAuth';
import {
  BLOG_REGIONS,
  BLOG_MONETIZATION_MODES,
  BLOG_STYLES,
  createAutonomousBlogBusiness,
  createBlogPost,
  listAutonomousBusinesses,
  listBlogStyles,
  listBlogPosts,
  listEditorialNetwork,
  listMonetizationModes,
  listNichePlaybooks,
  summarizeBlogEngine,
  type BlogMonetizationMode,
  type BlogRegion,
  type BlogStyle,
} from '@/src/content/blog-engine';

export const runtime = 'nodejs';

type CreateBlogBody = {
  operation?: unknown;
  launchBusiness?: unknown;
  topic?: unknown;
  businessType?: unknown;
  audience?: unknown;
  region?: unknown;
  style?: unknown;
  nicheId?: unknown;
  brandName?: unknown;
  postCount?: unknown;
  monetizationMode?: unknown;
  cityFocus?: unknown;
  primaryKeyword?: unknown;
  secondaryKeywords?: unknown;
  callToAction?: unknown;
  tone?: unknown;
  enqueueToCto?: unknown;
};

type BlogOperation = 'generate-post' | 'launch-business';

function parseRegion(value: string | undefined): BlogRegion | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!BLOG_REGIONS.includes(normalized as BlogRegion)) {
    return undefined;
  }
  return normalized as BlogRegion;
}

function parseTone(value: unknown): 'friendly' | 'sales' | 'support' {
  if (value === 'friendly' || value === 'sales' || value === 'support') {
    return value;
  }
  return 'sales';
}

function parseStyle(value: unknown): BlogStyle | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return BLOG_STYLES.includes(normalized as BlogStyle)
    ? (normalized as BlogStyle)
    : undefined;
}

function parseMonetizationMode(value: unknown): BlogMonetizationMode | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return BLOG_MONETIZATION_MODES.includes(normalized as BlogMonetizationMode)
    ? (normalized as BlogMonetizationMode)
    : undefined;
}

function parseOperation(value: unknown, launchBusinessFlag: unknown): BlogOperation {
  if (parseBoolean(launchBusinessFlag, false)) {
    return 'launch-business';
  }

  if (typeof value !== 'string') {
    return 'generate-post';
  }

  return value.trim().toLowerCase() === 'launch-business'
    ? 'launch-business'
    : 'generate-post';
}

function parsePostCount(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(2, Math.min(Math.floor(numeric), 6));
}

function parseFlexibleStringArray(value: unknown): string[] {
  const fromArray = parseStringArray(value);
  if (fromArray && fromArray.length > 0) {
    return fromArray;
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 12);
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const url = new URL(request.url);
    const limit = parseLimit(request, 20, 1, 100);
    const search = parseOptionalString(url.searchParams.get('search'));
    const region = parseRegion(parseOptionalString(url.searchParams.get('region')));

    const [posts, businesses, summary] = await Promise.all([
      listBlogPosts({
        limit,
        search,
        region,
      }),
      listAutonomousBusinesses({
        limit: Math.min(limit, 40),
        search,
      }),
      summarizeBlogEngine(),
    ]);

    return jsonResponse({
      regions: BLOG_REGIONS,
      styles: listBlogStyles(),
      monetizationModes: listMonetizationModes(),
      nichePlaybooks: listNichePlaybooks(),
      summary,
      editorialNetwork: listEditorialNetwork(),
      businesses,
      posts,
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<CreateBlogBody>(request);
    const operation = parseOperation(body.operation, body.launchBusiness);

    let queueResult: { added: number; total: number } | undefined;

    if (operation === 'launch-business') {
      const launchResult = await createAutonomousBlogBusiness({
        nicheId: parseOptionalString(body.nicheId),
        brandName: parseOptionalString(body.brandName),
        region: parseRegion(parseOptionalString(body.region)),
        cityFocus: parseFlexibleStringArray(body.cityFocus),
        postCount: parsePostCount(body.postCount),
        tone: parseTone(body.tone),
        style: parseStyle(body.style),
        monetizationMode: parseMonetizationMode(body.monetizationMode),
      });

      if (parseBoolean(body.enqueueToCto, false)) {
        await requireOperatorAccess(request, { adminOnly: true });
        const appendResult = await appendTaskDrafts(
          launchResult.business.launchTasks.map((task) => ({
            type: 'feature',
            description: `[Autonomous Blog] ${task.title}: ${launchResult.business.name}`,
            metadata: {
              pipeline: 'blog-autonomous-business',
              businessId: launchResult.business.id,
              nicheId: launchResult.business.nicheId,
              ownerRole: task.ownerRole,
              taskId: task.id,
              region: launchResult.business.region,
            },
          })),
          {
            dedupeByDescription: true,
            idPrefix: 'blog-business',
          }
        );

        queueResult = {
          added: appendResult.added.length,
          total: appendResult.total,
        };
      }

      const summary = await summarizeBlogEngine();

      return jsonResponse(
        {
          operation,
          business: launchResult.business,
          posts: launchResult.posts,
          queue: queueResult,
          summary,
        },
        201
      );
    }

    const topic = parseOptionalString(body.topic);

    if (!topic) {
      throw new ApiError(400, 'Topic is required to generate a blog post', 'BLOG_TOPIC_REQUIRED');
    }

    const post = await createBlogPost({
      topic,
      businessType: parseOptionalString(body.businessType),
      audience: parseOptionalString(body.audience),
      region: parseRegion(parseOptionalString(body.region)),
      cityFocus: parseFlexibleStringArray(body.cityFocus),
      primaryKeyword: parseOptionalString(body.primaryKeyword),
      secondaryKeywords: parseFlexibleStringArray(body.secondaryKeywords),
      callToAction: parseOptionalString(body.callToAction),
      tone: parseTone(body.tone),
      style: parseStyle(body.style),
      nicheId: parseOptionalString(body.nicheId),
      monetizationMode: parseMonetizationMode(body.monetizationMode),
    });

    if (parseBoolean(body.enqueueToCto, false)) {
      await requireOperatorAccess(request, { adminOnly: true });
      const appendResult = await appendTaskDrafts(
        post.tasks.map((task) => ({
          type: 'feature',
          description: `[Blog Engine] ${task.title}: ${post.seo.title}`,
          metadata: {
            pipeline: 'blog-engine',
            blogPostId: post.id,
            blogSlug: post.seo.slug,
            ownerRole: task.ownerRole,
            taskId: task.id,
            region: post.region,
            style: post.style,
            nicheId: post.nicheId,
          },
        })),
        {
          dedupeByDescription: true,
          idPrefix: 'blog',
        }
      );

      queueResult = {
        added: appendResult.added.length,
        total: appendResult.total,
      };
    }

    const summary = await summarizeBlogEngine();

    return jsonResponse(
      {
        operation,
        post,
        queue: queueResult,
        summary,
      },
      201
    );
  });
}