'use client';

import { useRouter } from 'next/navigation';

interface PageSection {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

interface PageBuilderResultCardProps {
  pageTitle: string;
  sections: PageSection[];
}

const SECTION_ICONS: Record<string, string> = {
  hero: '🦸',
  services: '⚙️',
  features: '✨',
  testimonials: '💬',
  'pricing-table': '💰',
  'contact-form': '📬',
  team: '👥',
  stats: '📊',
  faq: '❓',
  cta: '🎯',
  gallery: '🖼️',
  'rich-text': '📝',
  'video-embed': '🎬',
  divider: '⎯',
};

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Banner',
  services: 'Services',
  features: 'Features',
  testimonials: 'Testimonials',
  'pricing-table': 'Pricing Table',
  'contact-form': 'Contact Form',
  team: 'Team',
  stats: 'Stats',
  faq: 'FAQ',
  cta: 'Call to Action',
  gallery: 'Gallery',
  'rich-text': 'Rich Text',
  'video-embed': 'Video',
  divider: 'Divider',
};

export default function PageBuilderResultCard({ pageTitle, sections }: PageBuilderResultCardProps) {
  const router = useRouter();

  function openInBuilder() {
    const encoded = btoa(JSON.stringify(sections));
    router.push(`/json-builder?s=${encoded}`);
  }

  function openPreview() {
    const encoded = btoa(JSON.stringify(sections));
    router.push(`/json-builder/preview?s=${encoded}&title=${encodeURIComponent(pageTitle)}`);
  }

  return (
    <div className="mt-3 rounded-xl border border-[#1E3A5F]/60 bg-[#0d1826] overflow-hidden w-full max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1E3A5F]/40 border-b border-[#1E3A5F]/60">
        <div>
          <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold">Page Built</p>
          <p className="text-sm font-semibold text-white mt-0.5">{pageTitle}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">{sections.length} sections</p>
          <p className="text-xs text-blue-400/70 mt-0.5">Ready to edit</p>
        </div>
      </div>

      {/* Section list */}
      <div className="px-4 py-3 space-y-1.5">
        {sections.map((section, idx) => (
          <div key={section.id} className="flex items-center gap-2.5 text-xs">
            <span className="w-5 h-5 flex items-center justify-center rounded bg-[#1E3A5F]/60 text-[10px] flex-shrink-0">
              {idx + 1}
            </span>
            <span className="text-base leading-none flex-shrink-0">
              {SECTION_ICONS[section.type] ?? '📄'}
            </span>
            <span className="text-slate-300">
              {SECTION_LABELS[section.type] ?? section.type}
            </span>
            {typeof section.props?.headline === 'string' && section.props.headline && (
              <span className="text-slate-500 truncate max-w-[120px]">
                — {section.props.headline}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="px-4 pb-3 pt-1 flex gap-2">
        <button
          onClick={openInBuilder}
          className="flex-1 rounded-lg py-2 text-xs font-semibold bg-[#1E3A5F] text-white border border-[#1E3A5F] hover:bg-[#1E3A5F]/80 transition"
        >
          Open in Builder
        </button>
        <button
          onClick={openPreview}
          className="flex-1 rounded-lg py-2 text-xs font-semibold bg-transparent text-slate-300 border border-white/10 hover:border-white/20 transition"
        >
          Live Preview
        </button>
      </div>
    </div>
  );
}
