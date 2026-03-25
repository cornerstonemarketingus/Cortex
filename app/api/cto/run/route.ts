import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

type RunResult = {
  status: 'idle' | 'completed' | 'error';
  message?: string;
  duration_ms?: number;
  task?: unknown;
  error?: string;
  traceback?: string;
};

const PROCESS_TIMEOUT_MS = 120_000;

function parseLastJsonLine(output: string): RunResult | null {
  const lines = output.trim().split(/\r?\n/).reverse();
  for (const line of lines) {
    try {
      return JSON.parse(line) as RunResult;
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST() {
  return new Promise<Response>((resolve) => {
    const args = ['-m', 'engine.run_cto_once'];
    const child = spawn('python', args, { cwd: process.cwd() });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve(NextResponse.json(
        {
          status: 'error',
          error: `CTO run timed out after ${PROCESS_TIMEOUT_MS / 1000}s`,
        },
        { status: 504 }
      ));
    }, PROCESS_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      const parsed = parseLastJsonLine(stdout);
      if (parsed) {
        const statusCode = parsed.status === 'error' || code !== 0 ? 500 : 200;
        resolve(NextResponse.json(parsed, { status: statusCode }));
        return;
      }

      const detail = (stderr || stdout || `process exited with code ${code ?? 'unknown'}`).trim();
      resolve(NextResponse.json(
        {
          status: 'error',
          error: 'Failed to parse CTO runner output',
          detail,
        },
        { status: 500 }
      ));
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve(NextResponse.json(
        {
          status: 'error',
          error: err.message,
        },
        { status: 500 }
      ));
    });
  });
}
