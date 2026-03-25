import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/** Spawn `python --version` and return the version string or an error label. */
function checkPython(): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn('python', ['--version']);
    let out = '';
    child.stdout.on('data', (d: Buffer) => { out += d.toString().trim(); });
    child.stderr.on('data', (d: Buffer) => { out += d.toString().trim(); });
    child.on('close', (code) => resolve(code === 0 ? (out || 'ok') : 'unavailable'));
    child.on('error', () => resolve('unavailable'));
    // Hard timeout so the health check never hangs
    setTimeout(() => { child.kill(); resolve('timeout'); }, 3000);
  });
}

/** GET /api/health — system readiness check */
export async function GET() {
  const t0 = Date.now();
  const checks: Record<string, unknown> = {};

  // ── API keys (reports presence only — never the values) ──────────────────
  checks.api_key_openai    = !!process.env.OPENAI_API_KEY;
  checks.api_key_anthropic = !!process.env.ANTHROPIC_API_KEY;
  checks.has_any_api_key   = checks.api_key_openai || checks.api_key_anthropic;

  // ── Python runtime ────────────────────────────────────────────────────────
  checks.python = await checkPython();

  // ── Agent runner script present ───────────────────────────────────────────
  checks.agent_runner = fs.existsSync(
    path.join(process.cwd(), 'engine', 'run_agent.py')
  );

  // ── Logs directory writable ───────────────────────────────────────────────
  const logDir = path.join(process.cwd(), 'logs');
  try {
    fs.mkdirSync(logDir, { recursive: true });
    checks.log_dir = true;
  } catch {
    checks.log_dir = false;
  }

  // ── Prisma DB present (pending until first `prisma migrate dev`) ──────────
  checks.database = fs.existsSync(
    path.join(process.cwd(), 'prisma', 'dev.db')
  );

  // ── Assets JSON store (created on first write — pre-pass if absent) ───────
  checks.assets_store = fs.existsSync(
    path.join(process.cwd(), 'assets.json')
  ) || 'pending_first_write';

  // ── Determine overall status ──────────────────────────────────────────────
  // database is optional until migrated; assets_store is created lazily
  const OPTIONAL = new Set(['database', 'assets_store', 'has_any_api_key',
                             'api_key_openai', 'api_key_anthropic']);
  const degraded = Object.entries(checks).some(([k, v]) => {
    if (OPTIONAL.has(k)) return false;
    return v === false || v === 'unavailable' || v === 'timeout';
  });

  const pythonRuntime = typeof checks.python === 'string' ? checks.python : 'unavailable';
  const apiKeys = {
    openai: !!checks.api_key_openai,
    anthropic: !!checks.api_key_anthropic,
    any: !!checks.has_any_api_key,
  };
  const agentRunner = checks.agent_runner ? 'ok' : 'missing';
  const logDirStatus = checks.log_dir ? 'exists' : 'missing';
  const db = checks.database ? 'ok' : 'pending';

  return NextResponse.json(
    {
      status: degraded ? 'degraded' : 'ok',
      python_runtime: pythonRuntime,
      api_keys: apiKeys,
      agent_runner: agentRunner,
      log_dir: logDirStatus,
      db,
      checks,
      uptime_ms: Date.now() - t0,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
