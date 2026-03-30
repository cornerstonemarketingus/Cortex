"use client";

import { useState } from "react";

const exampleCode = `// Live sandbox preview\nfunction Hero() {\n  return (<section className=\"py-16\">\n    <h1 className=\"text-4xl font-bold\">Framing Services</h1>\n    <p className=\"mt-4\">Fast, local framing contractors — get a quote.</p>\n  </section>)\n}\n`;

export default function HomeSandboxPreview() {
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);

  const run = () => {
    if (running) return;
    setRunning(true);
    setCode('');
    let i = 0;
    const interval = setInterval(() => {
      i += 6;
      setCode(exampleCode.slice(0, i));
      if (i >= exampleCode.length) {
        clearInterval(interval);
        setRunning(false);
      }
    }, 32);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#03121a] p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Live Sandbox</p>
      <div className="mt-2 h-44 overflow-auto rounded-md bg-black/40 p-2 font-mono text-xs text-slate-200">{code || <span className="text-slate-500">No output yet — run a preview.</span>}</div>
      <div className="mt-2 flex gap-2">
        <button onClick={run} className="rounded-lg bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-900">Run Preview</button>
        <button onClick={() => setCode('')} className="rounded-lg border border-white/10 px-3 py-1 text-xs">Clear</button>
      </div>
    </div>
  );
}
