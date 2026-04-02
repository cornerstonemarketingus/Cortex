"use client";
/**
 * Component Registry + Renderer
 * Maps section `type` strings to React components.
 * Each component receives typed props and renders a styled preview.
 * Used by both the live builder canvas and the published site renderer.
 */

import React from 'react';
import type { PageSection, SectionType } from './page-model';

// ---- Individual Section Components ----

function HeroSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'Your Headline';
  const sub = (props.subheadline as string) || '';
  const ctaText = (props.ctaText as string) || 'Get Started';
  const ctaHref = (props.ctaHref as string) || '#';
  const variant = (props.variant as string) || 'centered';
  const bg = (props.backgroundUrl as string) || '';

  return (
    <section
      className="relative py-24 px-6 text-center"
      style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, #1E3A5F 0%, #0f2340 100%)' }}
    >
      {bg && <div className="absolute inset-0 bg-black/50" />}
      <div className={`relative z-10 max-w-4xl mx-auto ${variant === 'split' ? 'text-left' : 'text-center'}`}>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{headline}</h1>
        {sub && <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">{sub}</p>}
        <a
          href={ctaHref}
          className="inline-block px-8 py-4 bg-[#C69C6D] text-white font-semibold rounded-lg hover:bg-[#b8874e] transition-colors text-lg"
        >
          {ctaText}
        </a>
      </div>
    </section>
  );
}

function ServicesSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'Our Services';
  const items = (props.items as Array<{ title: string; description: string; icon?: string }>) || [];
  const columns = (props.columns as number) || 3;

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-[#1E3A5F] mb-12">{headline}</h2>
        <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-8`}>
          {items.map((item, i) => (
            <div key={i} className="p-6 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              {item.icon && <div className="text-3xl mb-3">{item.icon}</div>}
              <h3 className="text-xl font-semibold text-[#1E3A5F] mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'What Clients Say';
  const items = (props.items as Array<{ name: string; role?: string; quote: string }>) || [];

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-[#1E3A5F] mb-12">{headline}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
              <p className="text-gray-700 italic mb-4">&ldquo;{item.quote}&rdquo;</p>
              <div>
                <p className="font-semibold text-[#1E3A5F]">{item.name}</p>
                {item.role && <p className="text-sm text-gray-500">{item.role}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'Features';
  const sub = (props.subheadline as string) || '';
  const items = (props.items as Array<{ title: string; description: string; icon?: string }>) || [];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3">{headline}</h2>
          {sub && <p className="text-gray-600 max-w-2xl mx-auto">{sub}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#C69C6D] text-lg">{item.icon || '✓'}</span>
              </div>
              <div>
                <h3 className="font-semibold text-[#1E3A5F] mb-1">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'Ready to Get Started?';
  const subtext = (props.subtext as string) || '';
  const buttonText = (props.buttonText as string) || 'Get Started';
  const buttonHref = (props.buttonHref as string) || '#';
  const variant = (props.variant as string) || 'dark';

  const bg = variant === 'accent' ? 'bg-[#C69C6D]' : variant === 'light' ? 'bg-gray-100' : 'bg-[#1E3A5F]';
  const textColor = variant === 'light' ? 'text-[#1E3A5F]' : 'text-white';

  return (
    <section className={`py-20 px-6 ${bg}`}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className={`text-3xl font-bold ${textColor} mb-4`}>{headline}</h2>
        {subtext && <p className={`${textColor}/80 mb-8 text-lg`}>{subtext}</p>}
        <a
          href={buttonHref}
          className="inline-block px-8 py-4 bg-white text-[#1E3A5F] font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          {buttonText}
        </a>
      </div>
    </section>
  );
}

function ContactFormSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'Contact Us';
  const fields = (props.fields as string[]) || ['name', 'email', 'message'];
  const submitLabel = (props.submitLabel as string) || 'Send';

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-xl mx-auto">
        <h2 className="text-3xl font-bold text-[#1E3A5F] mb-8 text-center">{headline}</h2>
        <form className="space-y-4">
          {fields.map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
              {field === 'message' ? (
                <textarea className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent" rows={4} placeholder={`Your ${field}`} />
              ) : (
                <input type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent" placeholder={`Your ${field}`} />
              )}
            </div>
          ))}
          <button type="submit" className="w-full py-3 px-6 bg-[#1E3A5F] text-white font-semibold rounded-lg hover:bg-[#162d4a] transition-colors">
            {submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}

function StatsSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || '';
  const items = (props.items as Array<{ value: string; label: string }>) || [];

  return (
    <section className="py-16 px-6 bg-[#1E3A5F]">
      <div className="max-w-4xl mx-auto">
        {headline && <h2 className="text-2xl font-bold text-white text-center mb-8">{headline}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {items.map((item, i) => (
            <div key={i}>
              <div className="text-4xl font-bold text-[#C69C6D] mb-2">{item.value}</div>
              <div className="text-white/70 text-sm">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'FAQ';
  const items = (props.items as Array<{ question: string; answer: string }>) || [];

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-[#1E3A5F] mb-10 text-center">{headline}</h2>
        <div className="space-y-4">
          {items.map((item, i) => (
            <details key={i} className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer">
              <summary className="font-semibold text-[#1E3A5F]">{item.question}</summary>
              <p className="mt-3 text-gray-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function RichTextSection({ props }: { props: Record<string, unknown> }) {
  const content = (props.content as string) || '';
  const centered = (props.centered as boolean) || false;

  return (
    <section className={`py-16 px-6 bg-white ${centered ? 'text-center' : ''}`}>
      <div className="max-w-3xl mx-auto prose prose-lg" dangerouslySetInnerHTML={{ __html: content }} />
    </section>
  );
}

function PricingTableSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'Pricing';
  const tiers = (props.tiers as Array<{ name: string; price: string; period?: string; features: string[]; ctaText?: string; ctaHref?: string; highlighted?: boolean }>) || [];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-[#1E3A5F] mb-12">{headline}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <div key={i} className={`p-8 rounded-2xl border-2 ${tier.highlighted ? 'border-[#C69C6D] shadow-xl' : 'border-gray-200'}`}>
              {tier.highlighted && <div className="text-xs font-bold text-[#C69C6D] uppercase tracking-wide mb-2">Most Popular</div>}
              <h3 className="text-xl font-bold text-[#1E3A5F] mb-1">{tier.name}</h3>
              <div className="text-3xl font-bold text-[#1E3A5F] mb-1">{tier.price}</div>
              {tier.period && <div className="text-sm text-gray-500 mb-4">{tier.period}</div>}
              <ul className="space-y-2 mb-6">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-[#C69C6D]">✓</span> {f}
                  </li>
                ))}
              </ul>
              {tier.ctaText && (
                <a href={tier.ctaHref || '#'} className={`block text-center py-3 px-6 rounded-lg font-semibold transition-colors ${tier.highlighted ? 'bg-[#1E3A5F] text-white hover:bg-[#162d4a]' : 'border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white'}`}>
                  {tier.ctaText}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DividerSection() {
  return <div className="py-4 px-6"><hr className="border-gray-200" /></div>;
}

function GallerySection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'Gallery';
  const images = (props.images as string[]) || [];

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-[#1E3A5F] mb-10">{headline}</h2>
        {images.length === 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-video bg-gray-200 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((src, i) => (
              <img key={i} src={src} alt="" className="w-full aspect-video object-cover rounded-xl" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TeamSection({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || 'Our Team';
  const members = (props.members as Array<{ name: string; role?: string; bio?: string; avatarUrl?: string }>) || [];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-[#1E3A5F] mb-10">{headline}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {members.map((m, i) => (
            <div key={i} className="text-center">
              <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-3 overflow-hidden">
                {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" /> : null}
              </div>
              <p className="font-semibold text-[#1E3A5F]">{m.name}</p>
              {m.role && <p className="text-sm text-gray-500">{m.role}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoEmbedSection({ props }: { props: Record<string, unknown> }) {
  const url = (props.url as string) || '';
  const caption = (props.caption as string) || '';

  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        {url ? (
          <div className="aspect-video rounded-2xl overflow-hidden shadow-xl">
            <iframe src={url} className="w-full h-full" allow="autoplay; fullscreen" />
          </div>
        ) : (
          <div className="aspect-video bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400">Video placeholder</div>
        )}
        {caption && <p className="text-center text-sm text-gray-500 mt-3">{caption}</p>}
      </div>
    </section>
  );
}

// ---- Registry ----

type SectionRenderer = React.FC<{ props: Record<string, unknown> }>;

export const COMPONENT_REGISTRY: Record<SectionType, SectionRenderer> = {
  hero: HeroSection,
  services: ServicesSection,
  testimonials: TestimonialsSection,
  features: FeaturesSection,
  cta: CtaSection,
  'contact-form': ContactFormSection,
  gallery: GallerySection,
  'pricing-table': PricingTableSection,
  team: TeamSection,
  stats: StatsSection,
  faq: FaqSection,
  'rich-text': RichTextSection,
  'video-embed': VideoEmbedSection,
  divider: DividerSection as SectionRenderer,
};

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Hero Banner',
  services: 'Services Grid',
  testimonials: 'Testimonials',
  features: 'Features',
  cta: 'Call to Action',
  'contact-form': 'Contact Form',
  gallery: 'Photo Gallery',
  'pricing-table': 'Pricing Table',
  team: 'Team Members',
  stats: 'Stats Bar',
  faq: 'FAQ Accordion',
  'rich-text': 'Rich Text',
  'video-embed': 'Video Embed',
  divider: 'Divider',
};

/** Renders a single page section using the component registry. */
export function RenderSection({ section }: { section: PageSection }) {
  const Component = COMPONENT_REGISTRY[section.type];
  if (!Component) return <div className="p-4 text-red-500">Unknown section type: {section.type}</div>;
  return <Component props={section.props} />;
}

/** Renders all sections of a page. */
export function RenderPage({ sections }: { sections: PageSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <RenderSection key={section.id} section={section} />
      ))}
    </>
  );
}
