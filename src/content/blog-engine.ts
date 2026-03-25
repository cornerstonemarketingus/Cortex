import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { callOpenAiChat, type AiMessage, type ConversationTone } from '@/src/crm/core/openai';

export const BLOG_REGIONS = [
  'global',
  'north-america',
  'latin-america',
  'europe',
  'middle-east-africa',
  'asia-pacific',
] as const;

export const BLOG_STYLES = [
  'conversion-brief',
  'coffeehouse-feature',
  'local-news-brief',
  'crime-watch-briefing',
] as const;

export const BLOG_MONETIZATION_MODES = ['ads', 'sponsor', 'hybrid'] as const;

export type BlogRegion = (typeof BLOG_REGIONS)[number];
export type BlogStyle = (typeof BLOG_STYLES)[number];
export type BlogMonetizationMode = (typeof BLOG_MONETIZATION_MODES)[number];
export type EditorialRole = 'strategist' | 'writer' | 'editor' | 'qa';

export type EditorialWorker = {
  id: string;
  name: string;
  role: EditorialRole;
  qualityScore: number;
  throughputPerWeek: number;
  baseRateUsd: number;
  geoStrength: BlogRegion[];
  specialties: string[];
};

export type BlogNichePlaybook = {
  id: string;
  name: string;
  description: string;
  style: BlogStyle;
  region: BlogRegion;
  cityFocus: string[];
  businessType: string;
  audience: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  topicAngles: string[];
  callToAction: string;
  revenueStreams: string[];
  adPlacements: string[];
  sponsorPackages: string[];
  defaultMonetizationMode: BlogMonetizationMode;
};

export type BlogGenerationInput = {
  topic: string;
  businessType: string;
  audience: string;
  region: BlogRegion;
  cityFocus: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  callToAction: string;
  tone: ConversationTone;
  style: BlogStyle;
  nicheId?: string;
  monetizationMode: BlogMonetizationMode;
};

export type BlogExecutionTask = {
  id: string;
  title: string;
  description: string;
  ownerRole: EditorialRole;
  status: 'ready' | 'queued';
};

export type BlogMonetizationPlan = {
  mode: BlogMonetizationMode;
  revenueStreams: string[];
  adPlacements: string[];
  sponsorPackages: string[];
  seoGeoKeywordClusters: string[];
};

export type BlogPostRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'ready';
  topic: string;
  businessType: string;
  audience: string;
  region: BlogRegion;
  cityFocus: string[];
  style?: BlogStyle;
  nicheId?: string;
  seo: {
    title: string;
    metaDescription: string;
    slug: string;
    canonicalPath: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
  };
  geo: {
    mapPackPrompt: string;
    entityKeywords: string[];
    answerEngineQuestions: string[];
    profileUpdateChecklist: string[];
  };
  monetization?: BlogMonetizationPlan;
  operations: {
    model: 'managed-editorial-network';
    strategist: EditorialWorker;
    writer: EditorialWorker;
    editor: EditorialWorker;
    qa: EditorialWorker;
    estimatedCostUsd: number;
    turnaroundHours: number;
  };
  content: {
    headline: string;
    outline: string[];
    socialHook: string;
    faqs: string[];
    articleMarkdown: string;
  };
  tasks: BlogExecutionTask[];
};

export type AutonomousBusinessRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'active';
  name: string;
  mission: string;
  nicheId: string;
  style: BlogStyle;
  region: BlogRegion;
  cityFocus: string[];
  monetization: BlogMonetizationPlan;
  seededPosts: Array<{
    id: string;
    title: string;
    slug: string;
    keyword: string;
  }>;
  launchTasks: BlogExecutionTask[];
  kpiTargets: string[];
};

type BlogStore = {
  version: number;
  updatedAt: string;
  posts: BlogPostRecord[];
  businesses: AutonomousBusinessRecord[];
};

export type BlogListOptions = {
  limit?: number;
  region?: BlogRegion;
  search?: string;
};

export type BusinessListOptions = {
  limit?: number;
  search?: string;
};

export type AutonomousBusinessLaunchInput = {
  nicheId?: string;
  brandName?: string;
  region?: BlogRegion;
  cityFocus?: string[];
  postCount?: number;
  tone?: ConversationTone;
  style?: BlogStyle;
  monetizationMode?: BlogMonetizationMode;
};

const BLOG_STORE_PATH = path.join(process.cwd(), 'apps', 'current_app', 'content', 'blog_engine.json');

const BLOG_NICHE_PLAYBOOKS: BlogNichePlaybook[] = [
  {
    id: 'mn-coffee-briefing-newsroom',
    name: 'Minnesota Coffee Briefing Newsroom',
    description:
      'Coffee-style local briefing for Minnesota featuring civic updates, public safety coverage, and neighborhood business intel.',
    style: 'coffeehouse-feature',
    region: 'north-america',
    cityFocus: ['Minneapolis', 'Saint Paul', 'Duluth', 'Rochester'],
    businessType: 'hyperlocal media and local intelligence publication',
    audience: 'Minnesota residents, commuters, and local business owners',
    primaryKeyword: 'minnesota local news and crime updates',
    secondaryKeywords: [
      'minneapolis local news',
      'st paul crime report',
      'mn public safety updates',
      'minnesota neighborhood briefing',
      'twin cities morning digest',
    ],
    topicAngles: [
      'Morning coffee briefing: what changed overnight in Minneapolis and Saint Paul',
      'Minnesota neighborhood safety pulse: incidents, context, and prevention resources',
      'Twin Cities local business openings, closings, and city impact this week',
      'Public policy and school board decisions shaping families across Minnesota',
      'Weekend community events and weather-watch guidance around the Twin Cities',
    ],
    callToAction: 'Subscribe for the next Minnesota coffee briefing and local alert digest.',
    revenueStreams: [
      'programmatic display ads',
      'newsletter sponsorships',
      'sponsored local business spotlight',
      'geo-targeted lead gen partnerships',
    ],
    adPlacements: [
      'leaderboard ad after headline and summary block',
      'in-article contextual ad after section 2',
      'sticky sidebar ad for desktop readers',
      'newsletter sponsor placement in daily digest',
    ],
    sponsorPackages: [
      'Neighborhood Partner package with monthly mention and CTA',
      'Public Safety Ally package with weekly sponsorship slot',
      'Local Business Spotlight package with profile article placement',
    ],
    defaultMonetizationMode: 'hybrid',
  },
  {
    id: 'mn-home-services-growth',
    name: 'Minnesota Home Services Growth Journal',
    description:
      'Niche growth blog for home service operators focused on SEO, GEO, and demand capture in Minnesota markets.',
    style: 'conversion-brief',
    region: 'north-america',
    cityFocus: ['Minneapolis', 'Saint Paul', 'Bloomington'],
    businessType: 'home services growth media brand',
    audience: 'home service owners and marketing operators',
    primaryKeyword: 'minnesota home services seo',
    secondaryKeywords: [
      'hvac lead generation minnesota',
      'plumbing local seo mn',
      'roofing geo optimization',
      'home services ppc and seo',
    ],
    topicAngles: [
      'How Minnesota HVAC teams win local search in 90 days',
      'Geo pages that drive calls for plumbing companies in the Twin Cities',
      'Service-area SEO for roofing companies with local proof loops',
      'Weekly lead score dashboard for home service operators',
    ],
    callToAction: 'Book a growth sprint to deploy your Minnesota lead engine.',
    revenueStreams: [
      'affiliate tools for marketers',
      'sponsored software reviews',
      'consulting lead capture',
      'premium playbook memberships',
    ],
    adPlacements: [
      'high-intent CTA blocks after each framework section',
      'sticky lead magnet banner for downloadable checklist',
      'sponsored tools comparison module',
    ],
    sponsorPackages: [
      'Growth Tools sponsor slot',
      'Premium implementation partner feature',
    ],
    defaultMonetizationMode: 'hybrid',
  },
  {
    id: 'geo-ai-builder-insights',
    name: 'AI Builder and GEO Insights',
    description:
      'Thought leadership publication around app builders, website builders, AI operations, and answer-engine optimization.',
    style: 'conversion-brief',
    region: 'global',
    cityFocus: ['Austin'],
    businessType: 'ai product media and software growth publication',
    audience: 'founders, operators, and product leaders',
    primaryKeyword: 'ai app and website builder strategy',
    secondaryKeywords: [
      'geo optimization for ai products',
      'answer engine optimization playbook',
      'ai builder monetization',
      'saas seo frameworks',
    ],
    topicAngles: [
      'What top AI builders do differently to win search and distribution',
      'From prototype to monetization: playbook for AI builder products',
      'How GEO content loops convert traffic into booked demos',
    ],
    callToAction: 'Start your AI builder growth sprint with a conversion-first roadmap.',
    revenueStreams: [
      'software sponsorships',
      'affiliate software recommendations',
      'pipeline generation for services',
      'premium reports',
    ],
    adPlacements: [
      'sponsor card below intro',
      'comparison table sponsored slot',
      'ebook lead capture sidebar',
    ],
    sponsorPackages: [
      'SaaS feature package',
      'Category leader newsletter package',
    ],
    defaultMonetizationMode: 'hybrid',
  },
];

const EDITORIAL_NETWORK: EditorialWorker[] = [
  {
    id: 'strat-nyx',
    name: 'Nyx Carter',
    role: 'strategist',
    qualityScore: 95,
    throughputPerWeek: 18,
    baseRateUsd: 140,
    geoStrength: ['global', 'north-america', 'europe'],
    specialties: ['seo strategy', 'geo strategy', 'content moat', 'growth loops'],
  },
  {
    id: 'strat-alex',
    name: 'Alex Mendez',
    role: 'strategist',
    qualityScore: 92,
    throughputPerWeek: 16,
    baseRateUsd: 130,
    geoStrength: ['global', 'latin-america', 'north-america'],
    specialties: ['local seo', 'service businesses', 'geo pages', 'intent mapping'],
  },
  {
    id: 'writer-rhea',
    name: 'Rhea Sloan',
    role: 'writer',
    qualityScore: 94,
    throughputPerWeek: 24,
    baseRateUsd: 120,
    geoStrength: ['global', 'north-america', 'asia-pacific'],
    specialties: ['long-form blog', 'conversion copy', 'saas', 'ai products'],
  },
  {
    id: 'writer-kai',
    name: 'Kai Romero',
    role: 'writer',
    qualityScore: 91,
    throughputPerWeek: 26,
    baseRateUsd: 110,
    geoStrength: ['global', 'latin-america', 'europe'],
    specialties: ['local business', 'agency growth', 'marketing ops', 'community content'],
  },
  {
    id: 'editor-iris',
    name: 'Iris Vale',
    role: 'editor',
    qualityScore: 96,
    throughputPerWeek: 20,
    baseRateUsd: 125,
    geoStrength: ['global', 'north-america', 'middle-east-africa'],
    specialties: ['editorial qa', 'brand consistency', 'seo compliance', 'fact checks'],
  },
  {
    id: 'editor-milo',
    name: 'Milo Chen',
    role: 'editor',
    qualityScore: 93,
    throughputPerWeek: 22,
    baseRateUsd: 115,
    geoStrength: ['global', 'asia-pacific', 'europe'],
    specialties: ['technical editing', 'schema markup strategy', 'clarity optimization', 'geo refinement'],
  },
  {
    id: 'qa-suri',
    name: 'Suri Knox',
    role: 'qa',
    qualityScore: 94,
    throughputPerWeek: 30,
    baseRateUsd: 85,
    geoStrength: ['global', 'north-america', 'europe'],
    specialties: ['search intent checks', 'readability qa', 'link integrity', 'metadata audits'],
  },
  {
    id: 'qa-omar',
    name: 'Omar Hadley',
    role: 'qa',
    qualityScore: 92,
    throughputPerWeek: 28,
    baseRateUsd: 78,
    geoStrength: ['global', 'latin-america', 'middle-east-africa'],
    specialties: ['local relevance checks', 'geo entity validation', 'faq quality', 'cta testing'],
  },
];

function defaultStore(): BlogStore {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    posts: [],
    businesses: [],
  };
}

function normalizeText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function normalizeList(items: string[] | undefined, limit = 8): string[] {
  if (!Array.isArray(items)) return [];
  const deduped = new Set<string>();

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) continue;
    deduped.add(normalized);
    if (deduped.size >= limit) break;
  }

  return Array.from(deduped);
}

function normalizeRegion(value: string | undefined): BlogRegion {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'global';
  return BLOG_REGIONS.includes(normalized as BlogRegion)
    ? (normalized as BlogRegion)
    : 'global';
}

function normalizeStyle(value: string | undefined): BlogStyle {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'conversion-brief';
  return BLOG_STYLES.includes(normalized as BlogStyle)
    ? (normalized as BlogStyle)
    : 'conversion-brief';
}

function normalizeMonetizationMode(value: string | undefined): BlogMonetizationMode {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'hybrid';
  return BLOG_MONETIZATION_MODES.includes(normalized as BlogMonetizationMode)
    ? (normalized as BlogMonetizationMode)
    : 'hybrid';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function humanizeRegion(region: BlogRegion): string {
  return region
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function pickPlaybook(id: string | undefined): BlogNichePlaybook {
  if (!id) return BLOG_NICHE_PLAYBOOKS[0];
  return BLOG_NICHE_PLAYBOOKS.find((playbook) => playbook.id === id) || BLOG_NICHE_PLAYBOOKS[0];
}

function stylePrompt(style: BlogStyle): string {
  if (style === 'coffeehouse-feature') {
    return 'Use a warm, coffee-read style: reflective intro, short paragraphs, neighborhood context, and approachable language.';
  }

  if (style === 'local-news-brief') {
    return 'Use concise local newsroom style with short factual sections and clear context.';
  }

  if (style === 'crime-watch-briefing') {
    return 'Use a public-safety editorial voice: factual, non-sensational, resource-oriented, and community-responsible.';
  }

  return 'Use conversion-focused editorial style with direct recommendations and practical steps.';
}

async function ensureStore(): Promise<void> {
  try {
    await fs.access(BLOG_STORE_PATH);
  } catch {
    await fs.mkdir(path.dirname(BLOG_STORE_PATH), { recursive: true });
    await fs.writeFile(BLOG_STORE_PATH, JSON.stringify(defaultStore(), null, 2), 'utf-8');
  }
}

async function readStore(): Promise<BlogStore> {
  await ensureStore();
  try {
    const content = await fs.readFile(BLOG_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(content) as Partial<BlogStore>;
    if (!parsed || !Array.isArray(parsed.posts)) {
      return defaultStore();
    }

    return {
      version: Number(parsed.version) || 2,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      posts: parsed.posts,
      businesses: Array.isArray(parsed.businesses) ? parsed.businesses : [],
    };
  } catch {
    return defaultStore();
  }
}

async function writeStore(store: BlogStore): Promise<void> {
  const payload: BlogStore = {
    version: store.version,
    updatedAt: new Date().toISOString(),
    posts: store.posts,
    businesses: store.businesses,
  };
  await fs.writeFile(BLOG_STORE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}

function scoreWorker(worker: EditorialWorker, role: EditorialRole, input: BlogGenerationInput): number {
  if (worker.role !== role) return -1;

  const keywordPool = [
    input.topic,
    input.businessType,
    input.primaryKeyword,
    ...input.secondaryKeywords,
  ]
    .join(' ')
    .toLowerCase();

  const specialtyScore = worker.specialties.reduce((score, item) => {
    return keywordPool.includes(item.toLowerCase()) ? score + 6 : score;
  }, 0);

  const regionScore = worker.geoStrength.includes(input.region) ? 18 : worker.geoStrength.includes('global') ? 8 : 0;
  const throughputScore = Math.min(worker.throughputPerWeek, 30) / 3;

  return worker.qualityScore + specialtyScore + regionScore + throughputScore;
}

function pickWorker(role: EditorialRole, input: BlogGenerationInput): EditorialWorker {
  const ranked = EDITORIAL_NETWORK
    .filter((worker) => worker.role === role)
    .map((worker) => ({ worker, score: scoreWorker(worker, role, input) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.worker || EDITORIAL_NETWORK.find((worker) => worker.role === role) || EDITORIAL_NETWORK[0];
}

function buildOutline(input: BlogGenerationInput): string[] {
  const regionLabel = humanizeRegion(input.region);
  const city = input.cityFocus[0] || regionLabel;

  if (input.style === 'crime-watch-briefing') {
    return [
      `Public safety snapshot for ${city}`,
      'What changed in the last 24 hours and why it matters',
      'Prevention resources and verified city services',
      'Neighborhood watch actions and response timelines',
      `Next 7-day watchlist across ${regionLabel}`,
    ];
  }

  if (input.style === 'coffeehouse-feature') {
    return [
      `Morning coffee context for ${city}`,
      'Signals from local headlines and civic updates',
      'What residents and businesses should watch this week',
      'Actionable checklist before noon',
      `Community pulse and next-step briefing for ${regionLabel}`,
    ];
  }

  return [
    `Market context for ${input.primaryKeyword} in ${city}`,
    `How ${input.businessType} teams use GEO signals to rank in answer engines`,
    'Implementation framework: authority pages, local proof, and conversion hooks',
    'Measurement stack: traffic quality, local intent, and revenue attribution',
    `90-day execution plan for ${regionLabel}`,
  ];
}

function buildFaqs(input: BlogGenerationInput): string[] {
  const city = input.cityFocus[0] || humanizeRegion(input.region);

  if (input.style === 'crime-watch-briefing') {
    return [
      `Where can residents verify incidents in ${city} from trusted sources?`,
      'Which prevention steps have the highest impact for neighborhoods?',
      'How often should local briefings update to stay accurate and useful?',
    ];
  }

  return [
    `How quickly can ${input.businessType} teams improve rankings for ${input.primaryKeyword}?`,
    `Which GEO signals matter most for local visibility in ${city}?`,
    'How do we connect blog traffic to qualified pipeline and booked calls?',
  ];
}

function buildFallbackArticle(input: BlogGenerationInput, seoTitle: string, outline: string[]): string {
  const cityLabel = input.cityFocus.join(', ') || humanizeRegion(input.region);
  const sections = outline
    .map((heading) => {
      return `## ${heading}\n\n${input.businessType} teams can compound growth by publishing focused, evidence-backed content around ${input.primaryKeyword}. Build each section with local proof, conversion CTAs, and explicit next-step messaging for ${cityLabel}.`;
    })
    .join('\n\n');

  return [
    `# ${seoTitle}`,
    '',
    `High-performing SEO and GEO execution requires relevance, authority, and conversion readiness. This playbook targets ${cityLabel} and aligns each article section with measurable business outcomes.`,
    '',
    sections,
    '',
    '## Next Step',
    '',
    input.callToAction,
  ].join('\n');
}

async function generateArticleMarkdown(
  input: BlogGenerationInput,
  seoTitle: string,
  outline: string[]
): Promise<string> {
  const cityLabel = input.cityFocus.join(', ') || humanizeRegion(input.region);

  const prompt = [
    'Write a premium long-form markdown blog post for the following campaign.',
    `Title: ${seoTitle}`,
    `Topic: ${input.topic}`,
    `Business type: ${input.businessType}`,
    `Audience: ${input.audience}`,
    `Primary keyword: ${input.primaryKeyword}`,
    `Secondary keywords: ${input.secondaryKeywords.join(', ') || 'none'}`,
    `Region: ${humanizeRegion(input.region)}`,
    `City focus: ${cityLabel}`,
    `Writing style: ${input.style}`,
    `Call to action: ${input.callToAction}`,
    `Required sections: ${outline.join(' | ')}`,
    'Output requirements:',
    '- markdown only',
    '- include a compelling intro',
    '- include concrete implementation steps',
    '- include one FAQ section',
    '- keep conversion-oriented language',
    '- avoid sensational language for public safety content',
  ].join('\n');

  const messages: AiMessage[] = [
    {
      role: 'system',
      content: [
        'You are a senior editorial director building high-conversion SEO and GEO content for enterprise teams.',
        stylePrompt(input.style),
        'Return markdown only.',
      ].join(' '),
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const generated = await callOpenAiChat(messages, input.tone);
    if (!generated || generated.trim().length < 320 || /^auto-reply/i.test(generated.trim())) {
      return buildFallbackArticle(input, seoTitle, outline);
    }
    return generated.trim();
  } catch {
    return buildFallbackArticle(input, seoTitle, outline);
  }
}

function buildProfileChecklist(input: BlogGenerationInput): string[] {
  const city = input.cityFocus[0] || humanizeRegion(input.region);
  return [
    `Publish local proof snippets for ${city} on profile and location pages.`,
    `Align business category, services, and FAQs to ${input.primaryKeyword}.`,
    'Sync posting cadence between blog, profile updates, and social snippets.',
    'Track call clicks, direction requests, and lead form completions per article.',
  ];
}

function estimateCostUsd(
  strategist: EditorialWorker,
  writer: EditorialWorker,
  editor: EditorialWorker,
  qa: EditorialWorker,
  input: BlogGenerationInput
): number {
  const cityFactor = Math.max(input.cityFocus.length, 1);
  const keywordFactor = Math.max(input.secondaryKeywords.length, 1);
  const styleFactor = input.style === 'coffeehouse-feature' || input.style === 'crime-watch-briefing' ? 35 : 20;
  const base = strategist.baseRateUsd + writer.baseRateUsd + editor.baseRateUsd + qa.baseRateUsd;
  return Math.round(base + cityFactor * 18 + keywordFactor * 8 + styleFactor);
}

function buildMonetizationPlan(input: BlogGenerationInput, playbook?: BlogNichePlaybook): BlogMonetizationPlan {
  const fallbackRevenue = ['programmatic ads', 'sponsor blocks', 'affiliate offers'];
  const fallbackAdPlacements = [
    'hero leaderboard placement',
    'inline ad after second section',
    'newsletter sponsor block',
  ];
  const fallbackPackages = ['featured partner mention', 'monthly category sponsor'];

  return {
    mode: input.monetizationMode,
    revenueStreams: playbook?.revenueStreams || fallbackRevenue,
    adPlacements: playbook?.adPlacements || fallbackAdPlacements,
    sponsorPackages: playbook?.sponsorPackages || fallbackPackages,
    seoGeoKeywordClusters: [input.primaryKeyword, ...input.secondaryKeywords].slice(0, 10),
  };
}

function buildLaunchTasks(
  brandName: string,
  playbook: BlogNichePlaybook,
  style: BlogStyle,
  monetizationMode: BlogMonetizationMode
): BlogExecutionTask[] {
  return [
    {
      id: 'launch-brand',
      title: 'Launch publication identity',
      description: `Finalize brand voice, visual identity, and audience promise for ${brandName}.`,
      ownerRole: 'strategist',
      status: 'ready',
    },
    {
      id: 'launch-editorial-calendar',
      title: 'Build 30-day editorial calendar',
      description: `Turn ${playbook.name} topic angles into a weekly publishing cadence for style ${style}.`,
      ownerRole: 'writer',
      status: 'ready',
    },
    {
      id: 'launch-monetization',
      title: 'Activate monetization stack',
      description: `Configure ${monetizationMode} model with ad placements and sponsor packages.`,
      ownerRole: 'editor',
      status: 'ready',
    },
    {
      id: 'launch-seo-geo-loop',
      title: 'Deploy SEO and GEO feedback loop',
      description: 'Ship keyword clusters, local intent entities, and answer-engine update cadence.',
      ownerRole: 'qa',
      status: 'ready',
    },
  ];
}

export function listEditorialNetwork(): EditorialWorker[] {
  return EDITORIAL_NETWORK;
}

export function listNichePlaybooks(): BlogNichePlaybook[] {
  return BLOG_NICHE_PLAYBOOKS;
}

export function listBlogStyles(): BlogStyle[] {
  return [...BLOG_STYLES];
}

export function listMonetizationModes(): BlogMonetizationMode[] {
  return [...BLOG_MONETIZATION_MODES];
}

export async function listBlogPosts(options?: BlogListOptions): Promise<BlogPostRecord[]> {
  const store = await readStore();
  const limit = Math.max(1, Math.min(options?.limit || 25, 200));
  const region = options?.region;
  const search = options?.search?.trim().toLowerCase();

  return store.posts
    .filter((post) => {
      if (region && post.region !== region) return false;
      if (!search) return true;

      const haystack = [
        post.topic,
        post.businessType,
        post.audience,
        post.seo.title,
        post.seo.primaryKeyword,
        ...post.seo.secondaryKeywords,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    })
    .slice(0, limit);
}

export async function listAutonomousBusinesses(options?: BusinessListOptions): Promise<AutonomousBusinessRecord[]> {
  const store = await readStore();
  const limit = Math.max(1, Math.min(options?.limit || 30, 100));
  const search = options?.search?.trim().toLowerCase();

  return store.businesses
    .filter((business) => {
      if (!search) return true;
      const haystack = [business.name, business.mission, business.nicheId, ...business.cityFocus]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    })
    .slice(0, limit);
}

export async function summarizeBlogEngine() {
  const store = await readStore();
  const byRegion = BLOG_REGIONS.reduce<Record<BlogRegion, number>>((acc, region) => {
    acc[region] = 0;
    return acc;
  }, {} as Record<BlogRegion, number>);

  let ready = 0;
  for (const post of store.posts) {
    byRegion[post.region] += 1;
    if (post.status === 'ready') ready += 1;
  }

  return {
    total: store.posts.length,
    ready,
    draft: store.posts.length - ready,
    byRegion,
    businesses: store.businesses.length,
    updatedAt: store.updatedAt,
  };
}

export async function createBlogPost(rawInput: Partial<BlogGenerationInput>): Promise<BlogPostRecord> {
  const playbook = rawInput.nicheId ? pickPlaybook(rawInput.nicheId) : undefined;
  const fallbackPlaybook = playbook || BLOG_NICHE_PLAYBOOKS[0];

  const topic = normalizeText(rawInput.topic, fallbackPlaybook.topicAngles[0] || 'AI growth engine for websites and apps');
  const businessType = normalizeText(rawInput.businessType, fallbackPlaybook.businessType);
  const audience = normalizeText(rawInput.audience, fallbackPlaybook.audience);
  const region = normalizeRegion(rawInput.region || fallbackPlaybook.region);
  const cityFocus = normalizeList(rawInput.cityFocus && rawInput.cityFocus.length > 0 ? rawInput.cityFocus : fallbackPlaybook.cityFocus, 6);
  const primaryKeyword = normalizeText(rawInput.primaryKeyword, fallbackPlaybook.primaryKeyword);
  const secondaryKeywords = normalizeList(
    rawInput.secondaryKeywords && rawInput.secondaryKeywords.length > 0
      ? rawInput.secondaryKeywords
      : fallbackPlaybook.secondaryKeywords,
    8
  );
  const callToAction = normalizeText(rawInput.callToAction, fallbackPlaybook.callToAction);
  const tone: ConversationTone = rawInput.tone === 'sales' || rawInput.tone === 'support' || rawInput.tone === 'friendly'
    ? rawInput.tone
    : 'sales';
  const style = rawInput.style ? normalizeStyle(rawInput.style) : fallbackPlaybook.style;
  const monetizationMode = normalizeMonetizationMode(rawInput.monetizationMode || fallbackPlaybook.defaultMonetizationMode);

  const input: BlogGenerationInput = {
    topic,
    businessType,
    audience,
    region,
    cityFocus,
    primaryKeyword,
    secondaryKeywords,
    callToAction,
    tone,
    style,
    nicheId: rawInput.nicheId,
    monetizationMode,
  };

  const focusLocation = cityFocus[0] || humanizeRegion(region);
  const headline = `${primaryKeyword} strategy for ${focusLocation}: ${topic}`.slice(0, 120);
  const seoTitle = `${headline} | Cortex`.slice(0, 140);
  const metaDescription = `${businessType} execution guide for ${focusLocation}. SEO + GEO strategy, conversion architecture, and practical rollout steps.`.slice(0, 160);
  const slug = slugify(`${topic}-${focusLocation}-${Date.now().toString().slice(-4)}`) || `blog-${Date.now()}`;
  const outline = buildOutline(input);
  const faqs = buildFaqs(input);
  const articleMarkdown = await generateArticleMarkdown(input, seoTitle, outline);

  const strategist = pickWorker('strategist', input);
  const writer = pickWorker('writer', input);
  const editor = pickWorker('editor', input);
  const qa = pickWorker('qa', input);
  const monetization = buildMonetizationPlan(input, playbook);

  const now = new Date().toISOString();
  const record: BlogPostRecord = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'ready',
    topic,
    businessType,
    audience,
    region,
    cityFocus,
    style,
    nicheId: rawInput.nicheId,
    seo: {
      title: seoTitle,
      metaDescription,
      slug,
      canonicalPath: `/blog/${slug}`,
      primaryKeyword,
      secondaryKeywords,
    },
    geo: {
      mapPackPrompt: `Strengthen local map visibility around ${primaryKeyword} in ${focusLocation} with proof points, reviews, and location-aware landing entities.`,
      entityKeywords: [primaryKeyword, ...secondaryKeywords].slice(0, 8),
      answerEngineQuestions: faqs,
      profileUpdateChecklist: buildProfileChecklist(input),
    },
    monetization,
    operations: {
      model: 'managed-editorial-network',
      strategist,
      writer,
      editor,
      qa,
      estimatedCostUsd: estimateCostUsd(strategist, writer, editor, qa, input),
      turnaroundHours: Math.max(18, Math.round(72 - (writer.throughputPerWeek + editor.throughputPerWeek) / 2)),
    },
    content: {
      headline,
      outline,
      socialHook: `New ${style} playbook: ${primaryKeyword} in ${focusLocation}.`,
      faqs,
      articleMarkdown,
    },
    tasks: [
      {
        id: 'brief',
        title: 'Finalize search intent brief',
        description: `Strategist validates intent clusters and keyword map for ${primaryKeyword}.`,
        ownerRole: 'strategist',
        status: 'ready',
      },
      {
        id: 'draft',
        title: 'Produce long-form draft',
        description: `Writer produces full article draft for ${topic}.`,
        ownerRole: 'writer',
        status: 'ready',
      },
      {
        id: 'editorial-qa',
        title: 'Editorial review and fact check',
        description: 'Editor and QA validate structure, claims, and conversion readiness.',
        ownerRole: 'editor',
        status: 'ready',
      },
      {
        id: 'schema-pack',
        title: 'Deploy metadata and GEO schema pack',
        description: 'Ship slug, meta, entity keywords, and answer-engine FAQ pack.',
        ownerRole: 'qa',
        status: 'ready',
      },
      {
        id: 'distribution',
        title: 'Distribute and repurpose',
        description: 'Repurpose into social snippets and profile updates for local visibility.',
        ownerRole: 'strategist',
        status: 'ready',
      },
    ],
  };

  const store = await readStore();
  store.posts.unshift(record);
  store.posts = store.posts.slice(0, 350);
  await writeStore(store);

  return record;
}

export async function createAutonomousBlogBusiness(rawInput: AutonomousBusinessLaunchInput): Promise<{
  business: AutonomousBusinessRecord;
  posts: BlogPostRecord[];
}> {
  const playbook = pickPlaybook(rawInput.nicheId);
  const style = rawInput.style ? normalizeStyle(rawInput.style) : playbook.style;
  const region = normalizeRegion(rawInput.region || playbook.region);
  const cityFocus = normalizeList(rawInput.cityFocus && rawInput.cityFocus.length > 0 ? rawInput.cityFocus : playbook.cityFocus, 6);
  const tone: ConversationTone = rawInput.tone === 'friendly' || rawInput.tone === 'sales' || rawInput.tone === 'support'
    ? rawInput.tone
    : 'friendly';
  const postCountRaw = Number(rawInput.postCount);
  const postCount = Number.isFinite(postCountRaw) ? Math.max(2, Math.min(Math.floor(postCountRaw), 6)) : 3;
  const monetizationMode = normalizeMonetizationMode(rawInput.monetizationMode || playbook.defaultMonetizationMode);
  const brandName = normalizeText(rawInput.brandName, `Cortex ${playbook.name}`);

  const generatedPosts: BlogPostRecord[] = [];
  for (let index = 0; index < postCount; index += 1) {
    const topic = playbook.topicAngles[index % playbook.topicAngles.length] || `${playbook.name} daily briefing`;
    const post = await createBlogPost({
      topic,
      businessType: playbook.businessType,
      audience: playbook.audience,
      region,
      cityFocus,
      primaryKeyword: playbook.primaryKeyword,
      secondaryKeywords: playbook.secondaryKeywords,
      callToAction: `Subscribe to ${brandName} and receive the next briefing first.`,
      tone,
      style,
      nicheId: playbook.id,
      monetizationMode,
    });
    generatedPosts.push(post);
  }

  const monetization = buildMonetizationPlan(
    {
      topic: playbook.topicAngles[0],
      businessType: playbook.businessType,
      audience: playbook.audience,
      region,
      cityFocus,
      primaryKeyword: playbook.primaryKeyword,
      secondaryKeywords: playbook.secondaryKeywords,
      callToAction: playbook.callToAction,
      tone,
      style,
      nicheId: playbook.id,
      monetizationMode,
    },
    playbook
  );

  const launchTasks = buildLaunchTasks(brandName, playbook, style, monetizationMode);

  const now = new Date().toISOString();
  const business: AutonomousBusinessRecord = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'active',
    name: brandName,
    mission: `Build ${playbook.name} into a durable SEO + GEO publishing asset with monetized local and keyword-intent traffic.`,
    nicheId: playbook.id,
    style,
    region,
    cityFocus,
    monetization,
    seededPosts: generatedPosts.map((post) => ({
      id: post.id,
      title: post.seo.title,
      slug: post.seo.slug,
      keyword: post.seo.primaryKeyword,
    })),
    launchTasks,
    kpiTargets: [
      'Publish minimum 4 posts per week by week 2',
      'Reach 5,000 monthly local sessions within 90 days',
      'Achieve ad RPM baseline and first sponsor package close',
      'Track SEO + GEO keyword clusters with weekly optimization updates',
    ],
  };

  const store = await readStore();
  store.businesses.unshift(business);
  store.businesses = store.businesses.slice(0, 80);
  await writeStore(store);

  return {
    business,
    posts: generatedPosts,
  };
}
