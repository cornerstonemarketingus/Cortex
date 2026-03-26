"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MarketingNavItem = {
  href: string;
  label: string;
};

const primaryItems: MarketingNavItem[] = [
  { href: '/pricing', label: 'Home' },
  { href: '/estimate', label: 'Estimates' },
  { href: '/automations', label: 'Automations' },
  { href: '/builder', label: 'Page Builder' },
  { href: '/internal-copilot', label: 'Internal Copilot' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/dashboard', label: 'Dashboard' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PublicMarketingNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0d12]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-slate-100 uppercase">
          <span className="rounded-md border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-[11px] font-bold tracking-[0.14em] text-cyan-100">Builder Copilot</span>
        </Link>

        <nav className="hidden items-center gap-1.5 xl:flex">
          {primaryItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition ${
                  active
                    ? 'border border-cyan-300/45 bg-cyan-500/20 text-cyan-50'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/signup?next=/dashboard"
            className="rounded-md border border-cyan-300/40 bg-cyan-500/20 px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-cyan-50 transition hover:bg-cyan-500/30"
          >
            Login
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#0b0d12] xl:hidden">
        <div className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-4 py-1.5 md:px-10">
          {primaryItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
                  active
                    ? 'border border-cyan-300/45 bg-cyan-500/20 text-cyan-50'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
