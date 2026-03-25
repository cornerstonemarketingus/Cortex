import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#060b14] text-slate-200">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 md:grid-cols-3 md:px-10">
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Team Builder Copilot</p>
          <p className="mt-2 text-sm text-slate-300">
            Chat-driven platform for websites, CRM pipelines, estimator workflows, and automation delivery with managed hosting.
          </p>
        </section>

        <section>
          <p className="text-sm font-semibold text-slate-100">Core Links</p>
          <div className="mt-2 flex flex-col gap-1 text-sm text-slate-300">
            <Link href="/pricing" className="hover:text-white">Home</Link>
            <Link href="/chat" className="hover:text-white">Ask Copilot</Link>
            <Link href="/website-builder" className="hover:text-white">Website Builder</Link>
            <Link href="/builder-copilot" className="hover:text-white">Builder Copilot</Link>
          </div>
        </section>

        <section>
          <p className="text-sm font-semibold text-slate-100">Contact</p>
          <p className="mt-2 text-sm text-slate-300">hello@cortexengine.app</p>
          <p className="text-sm text-slate-300">+1 (651) 555-0198</p>
          <p className="mt-2 text-xs text-slate-400">Managed hosting, chatbot deployment, and voice receptionist setup available.</p>
        </section>
      </div>
    </footer>
  );
}
