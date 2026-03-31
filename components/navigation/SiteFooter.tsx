import Link from 'next/link';

const coreLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/services', label: 'Services' },
  { href: '/projects', label: 'Projects' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
];

const legalLinks = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#060b14] text-slate-200">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 md:grid-cols-3 md:px-10">
        {/* Brand */}
        <section>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-300/40 bg-amber-500/15 text-[13px] font-black text-amber-200">
              CC
            </span>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-100">
              Cornerstone Construction
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Premium construction services for residential, commercial, and industrial projects
            across Minnesota and the greater Midwest.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Cornerstone Construction. All rights reserved.
          </p>
        </section>

        {/* Navigation */}
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-100">Quick Links</p>
          <nav className="mt-3 flex flex-col gap-1.5" aria-label="Footer navigation">
            {coreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="mt-5 text-sm font-bold uppercase tracking-[0.15em] text-slate-100">Legal</p>
          <nav className="mt-3 flex flex-col gap-1.5" aria-label="Legal links">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </section>

        {/* Contact */}
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-100">Contact Us</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm text-slate-400">
            <a href="tel:6125565408" className="transition hover:text-white">
              📞 612-556-5408
            </a>
            <a href="mailto:support@teambuildercopilot.com" className="transition hover:text-white">
              ✉️ support@teambuildercopilot.com
            </a>
          </div>
          <Link
            href="/contact"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-amber-300/35 bg-amber-500/10 px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-amber-200 transition hover:bg-amber-500/20"
          >
            Request a Free Estimate
          </Link>
        </section>
      </div>
    </footer>
  );
}
