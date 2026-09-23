/**
 * Tiny test harness.
 *
 * The repo runs its tests as plain `tsx` scripts rather than through a test
 * framework, so this keeps that convention: collect suites, run them in order,
 * print a readable report, exit non-zero on the first failure count above zero.
 */

export type TestFn = () => void | Promise<void>;

type Suite = { name: string; tests: Array<{ name: string; fn: TestFn }> };

const suites: Suite[] = [];
let activeSuite: Suite | null = null;

export function describe(name: string, register: () => void): void {
  const suite: Suite = { name, tests: [] };
  suites.push(suite);
  activeSuite = suite;
  register();
  activeSuite = null;
}

export function it(name: string, fn: TestFn): void {
  if (!activeSuite) {
    throw new Error(`it("${name}") was called outside of a describe block`);
  }
  activeSuite.tests.push({ name, fn });
}

/**
 * Register a suite that only runs when a precondition holds (for example, a
 * live database). Skipped suites are reported explicitly rather than silently
 * omitted — a test that did not run is not a test that passed.
 */
export function describeIf(condition: boolean, reason: string, name: string, register: () => void): void {
  if (condition) {
    describe(name, register);
    return;
  }
  skipped.push({ name, reason });
}

const skipped: Array<{ name: string; reason: string }> = [];

export type RunReport = { passed: number; failed: number; skipped: number; durationMs: number };

export async function runAll(): Promise<RunReport> {
  const startedAt = Date.now();
  let passed = 0;
  let failed = 0;

  for (const suite of suites) {
    console.log(`\n${suite.name}`);
    for (const test of suite.tests) {
      try {
        await test.fn();
        passed += 1;
        console.log(`  ✓ ${test.name}`);
      } catch (error) {
        failed += 1;
        console.log(`  ✗ ${test.name}`);
        console.log(`      ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
          const frame = error.stack.split('\n').find((line) => line.includes('tests/'));
          if (frame) console.log(`      ${frame.trim()}`);
        }
      }
    }
  }

  for (const entry of skipped) {
    console.log(`\n${entry.name}`);
    console.log(`  - SKIPPED: ${entry.reason}`);
  }

  const durationMs = Date.now() - startedAt;
  const skippedNote = skipped.length > 0 ? `, ${skipped.length} suite(s) skipped` : '';
  console.log(`\n${passed} passed, ${failed} failed${skippedNote} (${durationMs}ms)`);
  return { passed, failed, skipped: skipped.length, durationMs };
}

/** Restore an environment variable to whatever it was before a test changed it. */
export async function withEnv<T>(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<T> | T
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
