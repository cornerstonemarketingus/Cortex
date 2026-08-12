import Link from 'next/link';
import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';

const links = [
  { href: '/website-builder', label: 'Website Builder', icon: '🌐' },
  { href: '/builder-copilot', label: 'Builder Copilot CRM', icon: '⚡' },
  { href: '/app-builder', label: 'App Builder', icon: '📱' },
];

export default function SitesFunnelsPage() {
  return (
    <PageShell>
      <PageHero
        align="left"
        kicker="Sites & Funnels"
        title="Growth surfaces"
        subtitle="Build and launch your website and funnel flows with one-click handoff into lead automation."
      />

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="group">
              <Card hover className="h-full">
                <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/60 flex items-center justify-center text-xl mb-4">{link.icon}</div>
                <p className="text-sm font-semibold text-white">{link.label}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#C69C6D] group-hover:gap-2 transition-all">
                  Open <span>→</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
