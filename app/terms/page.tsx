import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const sections: Array<{ title: string; body: string[] }> = [
  {
    title: '1. Acceptance of Terms',
    body: [
      'By creating an account, accessing, or using the ContractorPro platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and all applicable laws. These Terms constitute a legally binding agreement between you and ContractorPro.',
    ],
  },
  {
    title: '2. Intellectual Property and Proprietary Rights',
    body: [
      'All content, features, functionality, design, software, source code, algorithms, pricing models, estimation engines, data structures, trade cost databases, AI models, workflows, and user interface elements of the Platform are the exclusive property of ContractorPro and are protected by U.S. and international intellectual property laws.',
      'You may not copy, reproduce, reverse-engineer, decompile, disassemble, scrape, crawl, create derivative works, resell, sublicense, commercially exploit, build competing products, or remove proprietary notices from the Platform.',
      'Violations may result in immediate account termination and legal action.',
    ],
  },
  {
    title: '3. Anti-Cloning and Competitive Use Prohibition',
    body: [
      'You agree not to use the Platform, its design, feature set, pricing logic, or content to create or assist in creating a competing product or service during use of the Platform and for two (2) years after account termination.',
      'ContractorPro may pursue all available legal remedies, including injunctive relief and damages.',
    ],
  },
  {
    title: '4. Estimate Disclaimer',
    body: [
      'All estimates are approximations based on historical data, regional labor statistics, and market pricing at generation time. Estimates are for informational and planning use only and are not guaranteed to match actual project costs.',
      'Actual costs vary based on site conditions, contractor pricing, material availability, local code requirements, and other factors. Users should obtain multiple bids from licensed contractors before making financial decisions.',
    ],
  },
  {
    title: '5. User Accounts and Data',
    body: [
      'You are responsible for account credential confidentiality and for all activity under your account. You may not share your account or use another person\'s account without authorization.',
      'You retain ownership of customer and project data you submit, but grant ContractorPro a limited license to store and process that data for service delivery.',
      'ContractorPro does not sell your submitted customer data to third parties.',
    ],
  },
  {
    title: '6. Acceptable Use',
    body: [
      'You may not use the Platform for unlawful activity, harassment, fraud, abuse, or service disruption. ContractorPro may suspend or terminate violating accounts without refund.',
    ],
  },
  {
    title: '7. Payment and Subscriptions',
    body: [
      'Paid features are billed as shown at purchase. All sales are final unless otherwise stated in writing. ContractorPro may change pricing with at least 30 days notice to active subscribers.',
    ],
  },
  {
    title: '8. Limitation of Liability',
    body: [
      'To the maximum extent permitted by law, ContractorPro is not liable for indirect, incidental, special, consequential, or punitive damages, including lost profits, arising from use or inability to use the Platform.',
      'ContractorPro total liability is limited to amounts paid by you to ContractorPro during the twelve (12) months preceding the claim.',
    ],
  },
  {
    title: '9. Indemnification',
    body: [
      'You agree to indemnify, defend, and hold harmless ContractorPro and its officers, directors, employees, and agents from claims, liabilities, damages, and expenses arising from your use of the Platform or violation of these Terms.',
    ],
  },
  {
    title: '10. DMCA and Copyright Infringement',
    body: [
      'If you believe content on the Platform infringes your copyright, send a written notice identifying the copyrighted work, allegedly infringing material, location, your contact information, and a good-faith statement of unauthorized use to legal@teambuildercopilot.com.',
    ],
  },
  {
    title: '11. Governing Law and Disputes',
    body: [
      'These Terms are governed by the laws of the State of Texas, excluding conflict-of-law principles. Disputes will be resolved by binding arbitration under American Arbitration Association rules.',
      'You waive rights to jury trial and class action participation to the extent permitted by law.',
    ],
  },
  {
    title: '12. Changes to Terms',
    body: [
      'ContractorPro may modify these Terms at any time. Material changes will be communicated by email or in-app notice. Continued use after updates constitutes acceptance of revised Terms.',
    ],
  },
  {
    title: '13. Contact',
    body: [
      'Legal inquiries: legal@teambuildercopilot.com',
      'Business and compliance inquiries: compliance@teambuildercopilot.com',
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07143a] via-[#0d2a66] to-[#081736] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/35 bg-cyan-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-slate-300">Effective: March 1, 2026</p>
          <p className="mt-2 text-sm text-cyan-50/90">IMPORTANT: By accessing or using ContractorPro, you agree to these Terms. If you do not agree, do not use this platform.</p>
        </header>

        <section className="mt-6 space-y-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-white/15 bg-black/25 p-5">
              <h2 className="text-lg font-semibold text-cyan-100">{section.title}</h2>
              <div className="mt-2 space-y-2 text-sm text-slate-200">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-amber-300/35 bg-amber-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Mobile App and Storefront Compliance Note</p>
          <p className="mt-2 text-sm text-amber-50/90">
            These Terms are intended to support ContractorPro web and mobile distribution. For app marketplace submissions, include this page in your in-app legal menu and website footer to improve review readiness.
          </p>
        </section>
      </div>
    </main>
  );
}
