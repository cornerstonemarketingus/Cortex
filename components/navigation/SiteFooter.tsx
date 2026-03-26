import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#060b14] text-slate-200">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 md:grid-cols-3 md:px-10">
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Builder Copilot</p>
          <p className="mt-2 text-sm text-slate-300">
            Chat-driven platform for websites, CRM pipelines, estimator workflows, and automation delivery with managed hosting.
          </p>
        </section>

        <section>
          <p className="text-sm font-semibold text-slate-100">Core Links</p>
          <div className="mt-2 flex flex-col gap-1 text-sm text-slate-300">
            <Link href="/pricing" className="hover:text-white">Home</Link>
            <Link href="/estimate" className="hover:text-white">Estimates</Link>
            <Link href="/automations" className="hover:text-white">Automations</Link>
            <Link href="/builder" className="hover:text-white">Page Builder</Link>
            <Link href="/internal-copilot" className="hover:text-white">Internal Copilot</Link>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-100">Legal</p>
          <div className="mt-2 flex flex-col gap-1 text-sm text-slate-300">
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/data-deletion" className="hover:text-white">Data Deletion</Link>
          </div>
        </section>

        <section>
          <p className="text-sm font-semibold text-slate-100">Contact</p>
          <p className="mt-2 text-sm text-slate-300">support@teambuildercopilot.com</p>
          <p className="text-sm text-slate-300">legal@teambuildercopilot.com</p>
          <p className="text-sm text-slate-300">612-556-5408</p>
          <p className="mt-2 text-xs text-slate-400">Managed hosting, chatbot deployment, and voice receptionist setup available.</p>
        </section>
      </div>
    </footer>
  );
}
