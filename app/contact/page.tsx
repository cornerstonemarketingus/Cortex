import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';

export default function ContactPage() {
  return (
    <PageShell>
      <PageHero
        align="left"
        kicker="Contact"
        title="Talk with our team"
        subtitle="Share your project goals and we'll map the right product path: Bid Build, Builder Copilot, Cortex, or a hybrid deployment."
      />

      <div className="mx-auto max-w-4xl px-6 pb-16">
        <Card>
          <p className="text-sm text-slate-300">Support: support@teambuildercopilot.com</p>
          <p className="mt-1 text-sm text-slate-300">Legal: legal@teambuildercopilot.com</p>
          <p className="mt-1 text-sm text-slate-300">Sales line: 612-556-5408</p>
          <p className="mt-4 text-sm text-slate-400">
            For fastest response, include your business type, monthly lead volume, and whether you need contractor estimating, CRM automation, or both.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
