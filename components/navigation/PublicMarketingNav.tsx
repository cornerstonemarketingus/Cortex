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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0d12]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-10">
        <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-slate-100 uppercase">
          <Image src="/cortex-mark.svg" alt="Cortex Bid Build" width={168} height={48} className="h-7 w-auto" />
        </Link>

        <nav className="hidden items-center gap-1.5 xl:flex">
          {primaryItems.slice(0, 6).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition ${
                  active
                    ? 'bg-white text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]'
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
            href="/admin/login"
            className="rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-950 transition hover:bg-slate-200"
          >
            Client Login
          </Link>
          <Link
            href="/pricing"
            className="hidden rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-100 transition hover:bg-white/15 md:inline-flex"
          >
            Pricing
          </Link>
          <Link
            href="/admin/login"
            className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-100 transition hover:bg-white/15"
          >
            Sign In
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
                    ? 'bg-white text-slate-950'
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
