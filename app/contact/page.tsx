import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#071014] text-slate-100">
      <PublicMarketingNav />

      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-white/10 py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,184,77,0.1),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
            Let&apos;s Talk
          </p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white md:text-6xl">
            Start Your Project Today.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
            Tell us about your project and we&apos;ll get back to you within one business day with a
            complimentary consultation and preliminary estimate.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2">

            {/* Contact Form */}
            <div>
              <h2 className="mb-8 text-2xl font-black text-white">Request a Free Estimate</h2>
              <form
                action="https://formsubmit.co/support@teambuildercopilot.com"
                method="POST"
                className="flex flex-col gap-5"
              >
                {/* Honeypot */}
                <input type="text" name="_honey" className="hidden" />
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_subject" value="New Estimate Request — Cornerstone Construction" />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="first_name" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                      First Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      placeholder="John"
                      className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-300/50 focus:bg-white/[0.06]"
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                      Last Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      placeholder="Smith"
                      className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-300/50 focus:bg-white/[0.06]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Email Address <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-300/50 focus:bg-white/[0.06]"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(612) 000-0000"
                    className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-300/50 focus:bg-white/[0.06]"
                  />
                </div>

                <div>
                  <label htmlFor="project_type" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Project Type <span className="text-amber-400">*</span>
                  </label>
                  <select
                    id="project_type"
                    name="project_type"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-white/15 bg-[#0b0d12] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                  >
                    <option value="" disabled>Select a project type…</option>
                    <option value="commercial">Commercial Construction</option>
                    <option value="luxury_residential">Luxury Residential</option>
                    <option value="renovation">Renovation &amp; Remodeling</option>
                    <option value="design_build">Design-Build</option>
                    <option value="project_management">Project Management</option>
                    <option value="tenant_improvement">Tenant Improvements</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Project Description <span className="text-amber-400">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    placeholder="Tell us about your project, location, timeline, and budget range…"
                    className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-300/50 focus:bg-white/[0.06]"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.1em] text-slate-900 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
                >
                  Send My Request
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-8">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
                <h3 className="mb-5 text-[14px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Get in Touch
                </h3>
                <div className="flex flex-col gap-4">
                  <a href="tel:6125565408" className="flex items-center gap-3 text-sm text-slate-300 transition hover:text-white">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base">📞</span>
                    <span>612-556-5408</span>
                  </a>
                  <a href="mailto:support@teambuildercopilot.com" className="flex items-center gap-3 text-sm text-slate-300 transition hover:text-white">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base">✉️</span>
                    <span>support@teambuildercopilot.com</span>
                  </a>
                  <div className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base">📍</span>
                    <span>Minneapolis-Saint Paul Metro Area, MN &amp; Nationwide</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.06] p-7">
                <h3 className="mb-3 text-[14px] font-bold text-amber-200">What Happens Next?</h3>
                <ol className="flex flex-col gap-3 text-sm text-slate-400">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-500/15 text-[10px] font-black text-amber-300">1</span>
                    We review your request within 1 business day.
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-500/15 text-[10px] font-black text-amber-300">2</span>
                    A senior project manager contacts you to schedule a discovery call.
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-500/15 text-[10px] font-black text-amber-300">3</span>
                    We prepare a complimentary preliminary estimate and scope outline.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
