import fs from 'fs';
import path from 'path';

export const metadata = {
  title: 'Skipped Prompts',
};

type LogEntry = {
  ts: string;
  level: string;
  message: string;
};

function parseLogLine(line: string): LogEntry | null {
  // Expect lines like: [2026-03-16 20:32:05] [INFO] Skipping commit (...)
  const m = line.match(/^\[(.+?)\]\s+\[(.+?)\]\s+(.*)$/);
  if (!m) return null;
  return { ts: m[1], level: m[2], message: m[3] };
}

export default async function Page() {
  const logPath = path.resolve(process.cwd(), 'engine', 'logs', 'actions.log');
  let entries: LogEntry[] = [];
  try {
    const contents = fs.readFileSync(logPath, 'utf8');
    const lines = contents.split('\n').filter(Boolean);
    entries = lines.map(parseLogLine).filter(Boolean) as LogEntry[];
    // filter for skipped commits / skipped prompts
    entries = entries.filter((e) => /Skipping commit|skipped/i.test(e.message));
  } catch (e) {
    // ignore read errors; show empty state
    entries = [];
  }

  return (
    <main className="p-8">
      <section className="max-w-4xl">
        <h1 className="text-2xl font-semibold text-white">Skipped Prompts / Actions</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-400)' }}>Recent actions that were skipped by automation or CI hooks.</p>

        <div className="mt-4 space-y-3">
          {entries.length === 0 ? (
            <div className="rounded-md p-4" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--muted-400)' }}>No skipped entries found.</div>
          ) : (
            entries.map((e, i) => (
              <div key={i} className="rounded-lg p-3 bg-[var(--card-bg)] border border-card-bg">
                <div className="text-xs" style={{ color: 'var(--muted-400)' }}>{e.ts} — {e.level}</div>
                <div className="mt-1 text-sm text-white">{e.message}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
