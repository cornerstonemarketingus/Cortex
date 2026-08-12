import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';

const sections = [
  {
    title: 'What We Collect',
    body: 'We collect account details, project/estimate inputs, communications metadata, and usage analytics needed to operate Builder Copilot services.',
  },
  {
    title: 'How We Use Data',
    body: 'We use data to generate estimates, automate follow-up workflows, provide support, improve product reliability, and protect against fraud/abuse.',
  },
  {
    title: 'Sharing and Processors',
    body: 'We use subprocessors for hosting, messaging, email, payments, and AI features. We do not sell your customer records or project inputs.',
  },
  {
    title: 'Retention and Deletion',
    body: 'We retain data only as long as needed for service delivery, compliance, and security. You can submit deletion requests through the data deletion page.',
  },
  {
    title: 'Your Rights',
    body: 'You may request access, correction, export, or deletion of account data by contacting support@teambuildercopilot.com.',
  },
];

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageHero align="left" kicker="Legal" title="Privacy Policy" subtitle="Effective: March 25, 2026" />

      <div className="mx-auto max-w-5xl px-6 pb-16 space-y-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <h2 className="text-lg font-bold text-white">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">{section.body}</p>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
