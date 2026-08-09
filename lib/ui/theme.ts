/**
 * Shared design tokens matching the homepage (app/page.tsx) visual language.
 * Reuse these class strings so every page shares one dark, gold-accented,
 * card-based design system instead of one-off colors per page.
 */

export const PAGE_BG = 'min-h-screen bg-[#070b10] text-slate-100';

export const KICKER = 'text-xs uppercase tracking-[0.22em] text-[#C69C6D]';

export const CARD = 'rounded-2xl border border-white/10 bg-[#0d1826] p-6';
export const CARD_HOVER = 'rounded-2xl border border-white/10 bg-[#0d1826] p-6 hover:border-[#C69C6D]/40 transition-all';

export const BTN_PRIMARY_STYLE = { background: 'linear-gradient(135deg, #1E3A5F 0%, #C69C6D 100%)' };
export const BTN_PRIMARY = 'inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition';
export const BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition';

export const SECTION = 'mx-auto max-w-5xl px-6 py-12';
export const SECTION_WIDE = 'mx-auto max-w-6xl px-6 py-12';
