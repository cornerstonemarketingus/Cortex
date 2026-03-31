"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/projects', label: 'Projects' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PublicMarketingNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0d12]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-10">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 uppercase"
          aria-label="Cornerstone Construction — Home"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-300/40 bg-amber-500/15 text-[13px] font-black text-amber-200">
            CC
          </span>
          <span className="hidden text-[12px] font-black tracking-[0.22em] text-amber-50 sm:block">
            Cornerstone
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition ${
                  active
                    ? 'border border-amber-300/40 bg-amber-500/15 text-amber-100'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA + Mobile toggle */}
        <div className="flex items-center gap-2">
          <Link
            href="/contact"
            className="hidden rounded-md border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-amber-100 transition hover:bg-amber-500/25 sm:block"
          >
            Free Estimate
          </Link>
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="border-t border-white/10 bg-[#0b0d12] md:hidden"
        >
          <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Mobile navigation">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] transition ${
                    active
                      ? 'border border-amber-300/40 bg-amber-500/15 text-amber-100'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-md border border-amber-300/40 bg-amber-500/15 px-4 py-3 text-center text-[13px] font-bold uppercase tracking-[0.08em] text-amber-100 transition hover:bg-amber-500/25"
            >
              Free Estimate
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
