"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavTab = {
  href: string;
  label: string;
};

const navTabs: NavTab[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/chat', label: 'Ask Copilot' },
  { href: '/website-builder', label: 'Website Builder' },
  { href: '/builder-copilot', label: 'Builder Copilot' },
  { href: '/estimates', label: 'Estimates' },
  { href: '/subscription', label: 'Usage' },
];

function isActive(pathname: string, href: string): boolean {
  const [targetPath] = href.split('?');
  if (targetPath === '/') return pathname === '/';
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export default function CortexTopTabs() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-white/20 bg-[#030712]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {navTabs.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                    active
                      ? 'border-white bg-white text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]'
                      : 'border-white/25 bg-white/5 text-slate-100 hover:bg-white/15'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/admin/login"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-slate-100 hover:bg-white/10"
            >
              Client Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
