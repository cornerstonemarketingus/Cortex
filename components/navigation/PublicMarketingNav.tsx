"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MarketingNavItem = {
  href: string;
  label: string;
};

const primaryItems: MarketingNavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/leads', label: 'Leads' },
  { href: '/pipelines', label: 'Pipelines' },
  { href: '/automations', label: 'Automations' },
  { href: '/sites-funnels', label: 'Sites & Funnels' },
  { href: '/estimates', label: 'Estimates' },
  { href: '/payments', label: 'Payments' },
  { href: '/settings', label: 'Settings' },
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
    <header className="sticky top-0 z-50 border-b border-white/20 bg-[#030712]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-10">
        <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-slate-100 uppercase">
          <Image src="/cortex-mark.svg" alt="Cortex Bid Build" width={168} height={48} className="h-8 w-auto" />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {primaryItems.slice(0, 4).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-white text-slate-950'
                    : 'text-slate-200/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Open Workspace
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
          >
            Pricing
          </Link>
          <Link
            href="/admin/login"
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#030712]">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 md:px-10">
          {primaryItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? 'bg-white text-slate-950'
                    : 'text-slate-200/85 hover:bg-white/10 hover:text-white'
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
