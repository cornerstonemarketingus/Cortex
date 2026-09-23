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
