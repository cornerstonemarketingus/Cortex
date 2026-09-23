/**
 * Commercial estimating test suite.
 *
 * Run with: npm run test:commercial
 */

import { runAll } from './harness';

import './units.test';
import './scale.test';
import './sheet-metadata.test';
import './pdf-extraction.test';
import './job.test';
import './persistence.test';
import './residential-regression.test';

const report = await runAll();

if (report.failed > 0) {
  process.exitCode = 1;
}

/**
 * In CI, a skipped suite is a failure.
 *
 * The persistence suites skip themselves when COMMERCIAL_DATABASE_URL is unset,
 * which is right for a local run without a database and wrong for a pipeline
 * that claims to test persistence. Without this guard a misconfigured service
 * container would turn 19 integration assertions into a green tick.
 */
if (process.env.REQUIRE_ALL_SUITES === '1' && report.skipped > 0) {
  console.error(
    `\nREQUIRE_ALL_SUITES is set but ${report.skipped} suite(s) were skipped. ` +
      'Check COMMERCIAL_DATABASE_URL is reachable.'
  );
  process.exitCode = 1;
}
