"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ---- Types ----
interface StatCard { label: string; value: string | number; sub?: string; color?: string }
interface Activity { id: string; type: string; message: string; time: string }
interface CopilotMsg { role: 'user' | 'assistant'; text: string }

// ---- Copilot Sidebar ----
function CopilotSidebar() {
  const [messages, setMessages] = useState<CopilotMsg[]>([
    { role: 'assistant', text: "Hey! I'm your Cortex OS copilot. What do you need — estimates, workflows, leads, or builder help?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userMsg, context: { activePage: 'os-dashboard' } }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', text: data.text ?? "I'm on it!" }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: "Connection issue. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <h3 className="text-sm font-bold text-[#1E3A5F]">Cortex Copilot</h3>
        <span className="ml-auto text-xs text-gray-400">AI</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm rounded-xl px-3 py-2 max-w-[90%] ${
              m.role === 'assistant'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-[#1E3A5F] text-white ml-auto'
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="bg-gray-100 text-gray-500 text-sm rounded-xl px-3 py-2 w-16 animate-pulse">
            ...
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask anything..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
          />
          <button
            onClick={send}
            disabled={loading}
            className="px-3 py-2 bg-[#1E3A5F] text-white rounded-xl text-sm hover:bg-[#162d4a] disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </div>
    </aside>
  );
}

// ---- Quick Actions ----
const QUICK_ACTIONS = [
  { label: 'New Estimate', href: '/estimating', icon: '📋', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Open Builder', href: '/json-builder', icon: '🏗️', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Run Automation', href: '/automations', icon: '⚡', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { label: 'View Leads', href: '/crm', icon: '👥', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Voice Agent', href: '/settings/voice', icon: '📞', color: 'bg-red-50 text-red-700 border-red-200' },
  { label: 'SMS Center', href: '/communications', icon: '💬', color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

// ---- Nav items ----
const NAV_ITEMS = [
  { label: 'Overview', icon: '🏠', href: '/os' },
  { label: 'Projects', icon: '📁', href: '/projects' },
  { label: 'Estimating', icon: '📋', href: '/estimating' },
  { label: 'CRM / Leads', icon: '👥', href: '/crm' },
  { label: 'Scheduling', icon: '📅', href: '/scheduling' },
  { label: 'Website Builder', icon: '🏗️', href: '/json-builder' },
  { label: 'Automations', icon: '⚡', href: '/automations' },
  { label: 'Communications', icon: '💬', href: '/communications' },
  { label: 'Analytics', icon: '📊', href: '/analytics' },
  { label: 'Settings', icon: '⚙️', href: '/settings' },
];

// ---- Main ----
export default function ContractorOSPage() {
  const [stats] = useState<StatCard[]>([
    { label: 'Active Jobs', value: 12, sub: '+2 this week', color: 'border-blue-500' },
    { label: 'Open Estimates', value: 8, sub: '$142k total value', color: 'border-yellow-500' },
    { label: 'New Leads', value: 24, sub: '+6 today', color: 'border-green-500' },
    { label: 'Revenue (MTD)', value: '$48,200', sub: '↑ 18% vs last month', color: 'border-purple-500' },
    { label: 'Pending Invoices', value: 5, sub: '$21,500 due', color: 'border-red-500' },
    { label: 'Team Online', value: 7, sub: '2 in field', color: 'border-teal-500' },
  ]);

  const [activity] = useState<Activity[]>([
    { id: '1', type: 'lead', message: 'New lead: John Smith — Roofing replacement (1,800 sqft)', time: '2 min ago' },
    { id: '2', type: 'estimate', message: 'Estimate #1042 approved by Sarah Johnson — $18,400', time: '15 min ago' },
    { id: '3', type: 'sms', message: 'SMS follow-up sent to Mike Torres after missed call', time: '28 min ago' },
    { id: '4', type: 'job', message: 'Job #2031 marked complete by crew — Oak Street Framing', time: '1 hr ago' },
    { id: '5', type: 'review', message: 'Review request automation triggered for 3 completed jobs', time: '2 hr ago' },
    { id: '6', type: 'payment', message: 'Invoice #887 paid — $6,200 — Elm Ave Renovation', time: '3 hr ago' },
  ]);

  const activityIcon: Record<string, string> = {
    lead: '👤', estimate: '📋', sms: '💬', job: '🔨', review: '⭐', payment: '💰',
  };

  const [activeNav, setActiveNav] = useState('/os');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{ colorScheme: 'light' }}>

      {/* LEFT: Navigation sidebar */}
      <nav className="w-56 bg-[#1E3A5F] flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C69C6D] flex items-center justify-center text-white font-bold text-sm">C</div>
            <span className="text-white font-bold text-sm">Cortex OS</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setActiveNav(item.href)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                activeNav === item.href
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#C69C6D] flex items-center justify-center text-white text-xs font-bold">JD</div>
            <div>
              <p className="text-white text-xs font-medium">John D.</p>
              <p className="text-white/40 text-xs">Owner</p>
            </div>
          </div>
        </div>
      </nav>

      {/* CENTER: Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1E3A5F]">Contractor OS</h1>
            <p className="text-xs text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">
              🔔 Alerts
            </button>
            <Link
              href="/json-builder"
              className="text-sm bg-[#1E3A5F] text-white px-3 py-1.5 rounded-lg hover:bg-[#162d4a]"
            >
              + New Page
            </Link>
          </div>
        </header>

        <div className="p-6 space-y-6">

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {stats.map((s) => (
              <div key={s.label} className={`bg-white rounded-xl border-t-4 ${s.color} p-4 shadow-sm`}>
                <p className="text-xs text-gray-500 font-medium mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">{s.value}</p>
                {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`border rounded-xl p-3 text-center hover:shadow-md transition-shadow ${a.color}`}
                >
                  <div className="text-2xl mb-1">{a.icon}</div>
                  <div className="text-xs font-medium">{a.label}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity Feed + LLM Router status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Activity */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-700">Recent Activity</h2>
                <button className="text-xs text-[#1E3A5F] hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {activity.map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{activityIcon[a.type] ?? '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{a.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Services Status */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-700">AI Services Status</h2>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { name: 'LLM Router', sub: 'Cortex AI Engine', status: 'active' },
                  { name: 'Copilot Context Engine', sub: 'Multi-page awareness', status: 'active' },
                  { name: 'Estimator Engine', sub: '16 trade templates loaded', status: 'active' },
                  { name: 'Voice Agent', sub: 'AI receptionist — Twilio', status: 'standby' },
                  { name: 'SMS Service', sub: 'Twilio / Telnyx abstraction', status: 'active' },
                  { name: 'Automation Engine', sub: '4 preset workflows, 16 triggers', status: 'active' },
                  { name: 'JSON Builder', sub: 'dnd-kit + 14 section types', status: 'active' },
                ].map((svc) => (
                  <div key={svc.name} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{svc.name}</p>
                      <p className="text-xs text-gray-400">{svc.sub}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        svc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {svc.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                <div className="flex gap-2 flex-wrap">
                  <Link
                    href="/json-builder"
                    className="text-xs px-3 py-1.5 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a]"
                  >
                    Open Builder →
                  </Link>
                  <Link
                    href="/automations"
                    className="text-xs px-3 py-1.5 border border-[#1E3A5F] text-[#1E3A5F] rounded-lg hover:bg-[#1E3A5F]/5"
                  >
                    Automations →
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* RIGHT: Copilot */}
      <CopilotSidebar />
    </div>
  );
}
