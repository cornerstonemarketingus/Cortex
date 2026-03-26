export type SandboxBlueprint = 'website' | 'app' | 'business' | 'game';

export type SandboxPreviewInput = {
  blueprint: SandboxBlueprint;
  prompt: string;
  sections?: string[];
  modules?: string[];
  projectName?: string;
};

export type SandboxPreviewOutput = {
  title: string;
  summary: string;
  instructions: string[];
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(value: string, max = 180): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function guessBrandName(prompt: string, fallback: string): string {
  const cleaned = prompt
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');

  if (!cleaned) return fallback;
  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function cardGrid(items: string[], emptyText: string): string {
  const list = items.filter((item) => item.trim().length > 0);
  if (list.length === 0) {
    return `<article class="card">${escapeHtml(emptyText)}</article>`;
  }

  return list
    .slice(0, 8)
    .map((item) => `<article class="card">${escapeHtml(item)}</article>`)
    .join('');
}

function baseStyle(gradient: string): string {
  return `
    <style>
      :root {
        --bg-a: ${gradient.split('|')[0]};
        --bg-b: ${gradient.split('|')[1]};
        --bg-c: ${gradient.split('|')[2]};
        --panel: rgba(2, 6, 23, 0.7);
        --line: rgba(148, 163, 184, 0.35);
        --text: #e2e8f0;
        --muted: #cbd5e1;
        --accent: #f59e0b;
        --accent-soft: #fcd34d;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        color: var(--text);
        background: linear-gradient(150deg, var(--bg-a), var(--bg-b) 55%, var(--bg-c));
        min-height: 100vh;
        padding: 20px;
      }
      .shell {
        max-width: 1100px;
        margin: 0 auto;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--panel);
        backdrop-filter: blur(8px);
        overflow: hidden;
      }
      .hero {
        padding: 24px;
        border-bottom: 1px solid var(--line);
      }
      .hero p {
        margin: 8px 0 0;
        color: var(--muted);
        line-height: 1.45;
      }
      .hero h1 {
        margin: 0;
        font-size: 1.7rem;
      }
      .hero .cta {
        margin-top: 12px;
        display: inline-block;
        background: rgba(245, 158, 11, 0.25);
        border: 1px solid rgba(252, 211, 77, 0.55);
        border-radius: 10px;
        color: #fef3c7;
        text-decoration: none;
        padding: 10px 14px;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        padding: 16px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.45);
        padding: 12px;
        font-size: 0.88rem;
        line-height: 1.4;
      }
      .footer {
        padding: 16px;
        border-top: 1px solid var(--line);
        font-size: 0.8rem;
        color: var(--muted);
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--line);
        background: rgba(0, 0, 0, 0.2);
      }
      .brand {
        font-weight: 700;
        letter-spacing: 0.04em;
        color: #fde68a;
      }
      .toplinks {
        display: flex;
        gap: 10px;
        font-size: 0.8rem;
        color: var(--muted);
      }
      .toplinks span {
        padding: 4px 8px;
        border: 1px solid var(--line);
        border-radius: 999px;
      }
      .testimonial {
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px;
        background: rgba(15, 23, 42, 0.45);
      }
      .map-wrap {
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
        min-height: 220px;
        background: rgba(15, 23, 42, 0.45);
      }
      .map-wrap iframe {
        width: 100%;
        height: 220px;
        border: 0;
      }
      .tiny {
        font-size: 0.78rem;
        color: var(--muted);
      }
      .split {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 12px;
        padding: 16px;
      }
      .panel {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.45);
        padding: 12px;
      }
      .panel h2 {
        margin: 0 0 8px;
        font-size: 0.96rem;
      }
      .panel ul {
        margin: 0;
        padding-left: 18px;
      }
      .panel li { margin: 4px 0; }
      @media (max-width: 900px) {
        body { padding: 10px; }
        .split { grid-template-columns: 1fr; }
      }
    </style>
  `;
}

function renderWebsitePreview(input: SandboxPreviewInput): SandboxPreviewOutput {
  const brand = guessBrandName(input.projectName || input.prompt, 'Cortex Site');
  const sections = input.sections || [];
  const summary = truncate(input.prompt, 180);

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(brand)} Preview</title>
        ${baseStyle('#301500|#7c2d12|#2b0a03')}
      </head>
      <body>
        <main class="shell">
          <div class="topbar">
            <div class="brand">${escapeHtml(brand)}</div>
            <div class="toplinks">
              <span>Services</span>
              <span>Projects</span>
              <span>Financing</span>
              <span>Contact</span>
            </div>
          </div>
          <header class="hero">
            <h1>${escapeHtml(brand)} Live Website Sandbox</h1>
            <p>${escapeHtml(summary)}</p>
            <a class="cta" href="#" onclick="return false;">Request Quote</a>
          </header>
          <section class="grid">
            ${cardGrid(sections, 'Hero, services, trust, and quote sections are ready to render.')}
          </section>
          <section class="split">
            <article class="panel">
              <h2>Conversion Blocks</h2>
              <ul>
                <li>Tap-to-call CTA with sticky action bar</li>
                <li>Lead capture form with timeline and budget fields</li>
                <li>Trust badges, reviews, and before-after showcase</li>
                <li>Service area and city-level SEO blocks</li>
              </ul>
            </article>
            <article class="panel">
              <h2>Launch Notes</h2>
              <p class="tiny">This sandbox is a render-ready preview. Move to launch flow when copy, sections, and domain are approved.</p>
            </article>
          </section>
          <section class="grid">
            <article class="testimonial">
              <strong>"We doubled estimate requests in 30 days."</strong>
              <p class="tiny">Northline Roofing, Minneapolis</p>
            </article>
            <article class="testimonial">
              <strong>"The new intake flow reduced no-shows and sped up approvals."</strong>
              <p class="tiny">Summit Build Group, St. Paul</p>
            </article>
            <article class="map-wrap">
              <iframe title="Service area map" src="https://maps.google.com/maps?q=Minneapolis%20MN&t=&z=10&ie=UTF8&iwloc=&output=embed"></iframe>
            </article>
          </section>
          <footer class="footer">
            <div>${escapeHtml(brand)} • 612-556-5408 • support@teambuildercopilot.com</div>
            <div class="tiny">Generated by Cortex SiteForge preview renderer</div>
          </footer>
        </main>
      </body>
    </html>
  `;

  return {
    title: `${brand} Live Website Sandbox`,
    summary,
    instructions: [
      'Review section order and trust blocks in this live sandbox preview.',
      'Adjust prompt or modules, then regenerate to compare variants.',
      'When approved, proceed to full launch packet and domain connect.',
    ],
    html,
  };
}

function renderAppPreview(input: SandboxPreviewInput): SandboxPreviewOutput {
  const appName = guessBrandName(input.projectName || input.prompt, 'Cortex App');
  const modules = (input.modules || []).slice(0, 8);
  const summary = truncate(input.prompt, 180);

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(appName)} App Sandbox</title>
        ${baseStyle('#091e3f|#0f3f67|#07192f')}
      </head>
      <body>
        <main class="shell">
          <header class="hero">
            <h1>${escapeHtml(appName)} App Sandbox</h1>
            <p>${escapeHtml(summary)}</p>
          </header>
          <section class="split">
            <article class="panel">
              <h2>Module Stack</h2>
              <ul>
                ${modules.length > 0 ? modules.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>Lead Intake</li><li>Smart Routing</li><li>Workflow Automation</li>'}
              </ul>
            </article>
            <article class="panel">
              <h2>Operator Panel</h2>
              <div class="card">Pipeline health: 87%</div>
              <div class="card">Open tasks: 6</div>
              <div class="card">Active automations: 14</div>
            </article>
          </section>
          <section class="grid">
            <article class="card">Inbox and conversation timeline</article>
            <article class="card">Lead scoring and stage movement</article>
            <article class="card">Payments and subscription control</article>
            <article class="card">Retention and review automation</article>
          </section>
          <footer class="footer">Generated by Cortex AppForge sandbox renderer</footer>
        </main>
      </body>
    </html>
  `;

  return {
    title: `${appName} App Sandbox`,
    summary,
    instructions: [
      'Use this sandbox to validate module flow before implementation.',
      'Toggle module presets and regenerate to compare architecture variants.',
      'Move to launch once module stack and workflow panel are approved.',
    ],
    html,
  };
}

function renderBusinessPreview(input: SandboxPreviewInput): SandboxPreviewOutput {
  const systemName = guessBrandName(input.projectName || input.prompt, 'Cortex Business System');
  const modules = (input.modules || []).slice(0, 8);
  const summary = truncate(input.prompt, 180);

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(systemName)} Runtime Sandbox</title>
        ${baseStyle('#14213d|#264d7e|#0c1e33')}
      </head>
      <body>
        <main class="shell">
          <header class="hero">
            <h1>${escapeHtml(systemName)} Runtime Sandbox</h1>
            <p>${escapeHtml(summary)}</p>
          </header>
          <section class="grid">
            ${cardGrid(modules, 'AI takeoff, bid packaging, e-sign close, and reminder automations are active in this preview.')}
          </section>
          <section class="split">
            <article class="panel">
              <h2>Revenue Loop</h2>
              <ul>
                <li>Lead capture to qualification routing</li>
                <li>Estimate and proposal generation</li>
                <li>E-sign close and payment initiation</li>
                <li>Review, referral, and reactivation automations</li>
              </ul>
            </article>
            <article class="panel">
              <h2>Client Account Controls</h2>
              <ul>
                <li>Tenant isolation enabled</li>
                <li>Role-based access and policy controls</li>
                <li>Subscription and limits dashboard</li>
              </ul>
            </article>
          </section>
          <footer class="footer">Generated by Cortex Business Builder sandbox renderer</footer>
        </main>
      </body>
    </html>
  `;

  return {
    title: `${systemName} Runtime Sandbox`,
    summary,
    instructions: [
      'Validate the revenue loop chain before deploy actions.',
      'Check client account and policy settings for tenant safety.',
      'Launch once operations and reminders pass workflow checks.',
    ],
    html,
  };
}

function renderGamePreview(input: SandboxPreviewInput): SandboxPreviewOutput {
  const gameName = guessBrandName(input.projectName || input.prompt, 'Cortex Game');
  const summary = truncate(input.prompt, 180);

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(gameName)} Game Sandbox</title>
        ${baseStyle('#1b103d|#2f2b7a|#11122d')}
      </head>
      <body>
        <main class="shell">
          <header class="hero">
            <h1>${escapeHtml(gameName)} Playable Sandbox</h1>
            <p>${escapeHtml(summary)}</p>
            <p class="tiny">Controls: Arrow keys move. Collect cyan orbs to increase score.</p>
          </header>
          <section class="split">
            <article class="panel">
              <canvas id="sandbox-canvas" width="620" height="320" style="width:100%;max-width:100%;border:1px solid rgba(148,163,184,0.35);border-radius:10px;background:#020617"></canvas>
            </article>
            <article class="panel">
              <h2>Runtime Stats</h2>
              <div class="card">Score: <span id="score">0</span></div>
              <div class="card">Speed: 4 px/frame</div>
              <div class="card">Tick: <span id="tick">0</span></div>
            </article>
          </section>
          <footer class="footer">Generated by Cortex Game Builder sandbox renderer</footer>
        </main>

        <script>
          const canvas = document.getElementById('sandbox-canvas');
          const ctx = canvas.getContext('2d');
          const scoreEl = document.getElementById('score');
          const tickEl = document.getElementById('tick');

          const player = { x: 50, y: 140, w: 20, h: 20, speed: 4 };
          const orb = { x: 500, y: 160, r: 8 };
          const keys = new Set();
          let score = 0;
          let tick = 0;

          function placeOrb() {
            orb.x = 24 + Math.random() * (canvas.width - 48);
            orb.y = 24 + Math.random() * (canvas.height - 48);
          }

          window.addEventListener('keydown', (event) => keys.add(event.key));
          window.addEventListener('keyup', (event) => keys.delete(event.key));

          function step() {
            tick += 1;
            if (keys.has('ArrowUp')) player.y -= player.speed;
            if (keys.has('ArrowDown')) player.y += player.speed;
            if (keys.has('ArrowLeft')) player.x -= player.speed;
            if (keys.has('ArrowRight')) player.x += player.speed;

            player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
            player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

            const dx = (player.x + player.w / 2) - orb.x;
            const dy = (player.y + player.h / 2) - orb.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < orb.r + 10) {
              score += 1;
              placeOrb();
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#67e8f9';
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(player.x, player.y, player.w, player.h);

            scoreEl.textContent = String(score);
            tickEl.textContent = String(tick);
            requestAnimationFrame(step);
          }

          placeOrb();
          requestAnimationFrame(step);
        </script>
      </body>
    </html>
  `;

  return {
    title: `${gameName} Playable Sandbox`,
    summary,
    instructions: [
      'Use arrow keys to validate a playable prototype loop.',
      'Regenerate with a different prompt to alter theme and runtime profile.',
      'Approve once gameplay loop, telemetry, and milestone plan align.',
    ],
    html,
  };
}

export function generateSandboxPreview(input: SandboxPreviewInput): SandboxPreviewOutput {
  if (input.blueprint === 'website') {
    return renderWebsitePreview(input);
  }

  if (input.blueprint === 'app') {
    return renderAppPreview(input);
  }

  if (input.blueprint === 'business') {
    return renderBusinessPreview(input);
  }

  return renderGamePreview(input);
}
