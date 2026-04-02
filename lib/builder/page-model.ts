/**
 * JSON Page Model
 * Every page is expressed as an ordered array of sections.
 * Each section has a `type` (matching a component in the registry) and `props`.
 * This model is the single source of truth — persisted to DB, rendered by the engine.
 */

export type SectionType =
  | 'hero'
  | 'services'
  | 'testimonials'
  | 'features'
  | 'cta'
  | 'contact-form'
  | 'gallery'
  | 'pricing-table'
  | 'team'
  | 'stats'
  | 'faq'
  | 'rich-text'
  | 'video-embed'
  | 'divider';

export interface SectionBase {
  id: string;            // UUID — stable identifier for DnD
  type: SectionType;
  props: Record<string, unknown>;
}

// ---- Section prop shapes ----

export interface HeroProps {
  headline: string;
  subheadline?: string;
  ctaText?: string;
  ctaHref?: string;
  backgroundUrl?: string;
  variant?: 'centered' | 'split' | 'minimal';
}

export interface ServicesProps {
  headline?: string;
  items: Array<{ icon?: string; title: string; description: string }>;
  columns?: 2 | 3 | 4;
}

export interface TestimonialsProps {
  headline?: string;
  items: Array<{ name: string; role?: string; quote: string; avatarUrl?: string }>;
}

export interface FeaturesProps {
  headline?: string;
  subheadline?: string;
  items: Array<{ title: string; description: string; icon?: string }>;
  layout?: 'grid' | 'list';
}

export interface CtaProps {
  headline: string;
  subtext?: string;
  buttonText: string;
  buttonHref: string;
  variant?: 'dark' | 'accent' | 'light';
}

export interface ContactFormProps {
  headline?: string;
  fields?: string[];  // e.g. ['name', 'email', 'phone', 'message']
  submitLabel?: string;
  webhookUrl?: string;
}

export interface StatsProps {
  headline?: string;
  items: Array<{ value: string; label: string }>;
}

export interface FaqProps {
  headline?: string;
  items: Array<{ question: string; answer: string }>;
}

export interface RichTextProps {
  content: string;  // HTML string
  centered?: boolean;
}

export interface PricingTableProps {
  headline?: string;
  tiers: Array<{
    name: string;
    price: string;
    period?: string;
    features: string[];
    ctaText?: string;
    ctaHref?: string;
    highlighted?: boolean;
  }>;
}

// ---- Page model ----

export interface PageSection extends SectionBase {
  props: Record<string, unknown>;
}

export interface PageModel {
  id: string;
  slug: string;
  title: string;
  sections: PageSection[];
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string | null;
  updatedAt?: string;
}

export interface SiteModel {
  id: string;
  name: string;
  domain?: string;
  pages: PageModel[];
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
  };
}

// ---- Helpers ----

export function makeSectionId(): string {
  return `section_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSection(type: SectionType, props: Record<string, unknown>): PageSection {
  return { id: makeSectionId(), type, props };
}

/** Default props for each section type — used when copilot injects a new section. */
export const DEFAULT_SECTION_PROPS: Record<SectionType, Record<string, unknown>> = {
  hero: {
    headline: 'We Build What Others Can Only Plan',
    subheadline: 'Professional framing, roofing, and finishing — on time, on budget.',
    ctaText: 'Get a Free Estimate',
    ctaHref: '/estimate',
    variant: 'centered',
  } satisfies HeroProps,
  services: {
    headline: 'Our Services',
    items: [
      { title: 'Framing', description: 'Residential & commercial structural framing.' },
      { title: 'Roofing', description: 'Full roof installs, repairs, and replacements.' },
      { title: 'Finishing', description: 'Interior finishing for homes and offices.' },
    ],
    columns: 3,
  } satisfies ServicesProps,
  testimonials: {
    headline: 'What Our Clients Say',
    items: [
      { name: 'John R.', role: 'Homeowner', quote: 'Best contractor I have ever worked with. On time and on budget.' },
      { name: 'Sarah M.', role: 'Property Manager', quote: 'Responsive, professional, and top-quality work.' },
    ],
  } satisfies TestimonialsProps,
  features: {
    headline: 'Why Choose CORTEX',
    items: [
      { title: 'AI-Powered Estimates', description: 'Get accurate pricing in seconds.' },
      { title: 'Transparent Pricing', description: 'No surprises. Itemized quotes every time.' },
      { title: 'Licensed & Insured', description: 'Full coverage on every project.' },
    ],
    layout: 'grid',
  } satisfies FeaturesProps,
  cta: {
    headline: 'Ready to Start Your Project?',
    buttonText: 'Get a Free Estimate',
    buttonHref: '/estimate',
    variant: 'dark',
  } satisfies CtaProps,
  'contact-form': {
    headline: 'Contact Us',
    fields: ['name', 'email', 'phone', 'message'],
    submitLabel: 'Send Message',
  } satisfies ContactFormProps,
  gallery: { headline: 'Our Work', images: [] },
  'pricing-table': {
    headline: 'Simple Pricing',
    tiers: [
      { name: 'Starter', price: '$99/mo', features: ['5 estimates', 'Basic CRM'], ctaText: 'Start Free' },
      { name: 'Pro', price: '$299/mo', features: ['Unlimited estimates', 'Full CRM', 'Automations'], highlighted: true, ctaText: 'Get Pro' },
    ],
  } satisfies PricingTableProps,
  team: { headline: 'Meet the Team', members: [] },
  stats: {
    items: [
      { value: '500+', label: 'Projects Completed' },
      { value: '12yr', label: 'In Business' },
      { value: '4.9★', label: 'Average Rating' },
    ],
  } satisfies StatsProps,
  faq: {
    headline: 'Frequently Asked Questions',
    items: [
      { question: 'How quickly can I get an estimate?', answer: 'Most estimates are ready within minutes using our AI estimator.' },
    ],
  } satisfies FaqProps,
  'rich-text': { content: '<p>Add your content here.</p>' } satisfies RichTextProps,
  'video-embed': { url: '', caption: '' },
  divider: { style: 'line' },
};
