"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type NavTab = {
  href: string;
  label: string;
};

const navTabs: NavTab[] = [
  { href: '/', label: 'Home' },
  { href: '/signup', label: 'Start' },
  { href: '/estimate', label: 'Estimates' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/automations', label: 'Automations' },
  { href: '/website-builder', label: 'Page Builder' },
];

function isActive(pathname: string, href: string): boolean {
  const [targetPath] = href.split('?');
  if (targetPath === '/') return pathname === '/';
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export default function CortexTopTabs() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        const parsed = (await response.json().catch(() => ({}))) as { authenticated?: boolean };
        setIsAdmin(Boolean(response.ok && parsed.authenticated));
      } catch {
        setIsAdmin(false);
      }
    };

    void loadSession();
  }, []);

  const visibleTabs = useMemo(
    () => navTabs.filter((tab) => (tab.href === '/builder-copilot' ? isAdmin : true)),
    [isAdmin]
  );

  return (
    <nav className="sticky top-0 z-40 border-b border-white/20 bg-[#030712]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
        {/* Desktop row */}
        <div className="flex items-center justify-between gap-2">
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {visibleTabs.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                    active
                      ? 'border-cyan-300/45 bg-cyan-500/20 text-cyan-50'
                      : 'border-white/25 bg-white/5 text-slate-100 hover:bg-white/15'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile: label + toggle */}
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 md:hidden">
            Cortex
          </span>

          <div className="flex items-center gap-2">
            <Link
              href="/signup?next=/dashboard"
              className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10 md:inline-flex"
            >
              Login
            </Link>

            <button
              type="button"
              aria-controls="cortex-top-tabs-menu"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMenuOpen((c) => !c)}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10 md:hidden"
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen ? (
          <div id="cortex-top-tabs-menu" className="mt-2 grid grid-cols-1 gap-1.5 md:hidden">
            {visibleTabs.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-md border px-3 py-2 text-xs font-semibold tracking-wide transition ${
                    active
                      ? 'border-cyan-300/45 bg-cyan-500/20 text-cyan-50'
                      : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
            <Link
              href="/signup?next=/dashboard"
              className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-center text-xs font-semibold text-slate-100 hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
