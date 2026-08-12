import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const quickLinks = [
  { href: '/estimate', label: 'New Estimate' },
  { href: '/website-builder', label: 'Page Builder' },
  { href: '/automations', label: 'Automations' },
  { href: '/workspace', label: 'Open Workspace' },
];

const guidedFlow = [
  'Template → Customize → Publish → Capture Leads',
  'Preview → Publish → Capture',
  'Automations → Follow-up → Nurture',
];

export default function StartPage() {
  return (
    <PageShell>
      <PageHero kicker="Quick Launcher" title="Pick a starting point to get moving fast" />

      <div className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {quickLinks.map((link, index) => (
            <Button key={link.href} href={link.href} variant={index === 0 ? 'primary' : 'secondary'}>
              {link.label}
            </Button>
          ))}
        </div>

        <div className="mt-8">
          <Card>
            <h2 className="text-lg font-bold text-white">Guided Flow</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm text-slate-400">
              {guidedFlow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
