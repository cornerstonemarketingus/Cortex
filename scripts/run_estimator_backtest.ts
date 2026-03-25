import fs from 'node:fs/promises';
import path from 'node:path';
import { createBidEstimate } from '@/src/estimating/ai-takeoff';

type ClosedJobFixture = {
  description: string;
  projectCategory?: string;
  zipCode?: string;
  actualTotal: number;
};

type CategoryMetrics = {
  count: number;
  sumAbsolutePctError: number;
};

type BacktestReport = {
  generatedAt: string;
  fixtures: number;
  tenantId: string;
  subscriberEmail: string;
  thresholds: {
    overallMapePercent: number;
    categoryMapePercent: number;
  };
  overall: {
    mapePercent: number;
    pass: boolean;
  };
  categories: Array<{
    category: string;
    fixtures: number;
    mapePercent: number;
    pass: boolean;
  }>;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim().length === 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function parseReportPathArg(): string {
  const idx = process.argv.findIndex((arg) => arg === '--report-path');
  if (idx === -1) {
    return path.join(process.cwd(), 'tests', 'reports', 'estimator-backtest-report.json');
  }

  const value = process.argv[idx + 1];
  if (!value || value.trim().length === 0) {
    return path.join(process.cwd(), 'tests', 'reports', 'estimator-backtest-report.json');
  }

  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

async function loadFixtures(): Promise<ClosedJobFixture[]> {
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'estimator-closed-jobs.json');
  const raw = await fs.readFile(fixturePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid estimator fixture format');
  }

  return parsed.map((item) => {
    const value = item as Partial<ClosedJobFixture>;
    return {
      description: String(value.description || ''),
      projectCategory: value.projectCategory ? String(value.projectCategory) : undefined,
      zipCode: value.zipCode ? String(value.zipCode) : undefined,
      actualTotal: Number(value.actualTotal || 0),
    };
  });
}

async function postCalibrationEvent(params: {
  baseUrl: string;
  token: string;
  tenantId: string;
  subscriberEmail: string;
  fixture: ClosedJobFixture;
  estimatedTotal: number;
  estimateId: string;
}) {
  const response = await fetch(`${params.baseUrl}/api/estimating/calibrate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
      'x-tenant-id': params.tenantId,
    },
    body: JSON.stringify({
      tenantId: params.tenantId,
      subscriberEmail: params.subscriberEmail,
      projectCategory: params.fixture.projectCategory,
      zipCode: params.fixture.zipCode,
      estimateId: params.estimateId,
      estimatedTotal: params.estimatedTotal,
      actualTotal: params.fixture.actualTotal,
      notes: 'Automated fixture backtest delta sync',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed posting calibration event (${response.status}): ${body}`);
  }
}

async function main() {
  const fixtures = await loadFixtures();

  const tenantId = required('EST_BACKTEST_TENANT_ID');
  const subscriberEmail = required('EST_BACKTEST_SUBSCRIBER_EMAIL');
  const token = required('EST_BACKTEST_TOKEN');
  const baseUrl = (process.env.EST_BACKTEST_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
  const overallThreshold = optionalNumber('EST_BACKTEST_OVERALL_THRESHOLD', 8);
  const categoryThreshold = optionalNumber('EST_BACKTEST_CATEGORY_THRESHOLD', 12);

  const categoryMetrics = new Map<string, CategoryMetrics>();
  let totalAbsolutePctError = 0;

  for (const fixture of fixtures) {
    const estimate = createBidEstimate({
      description: fixture.description,
      projectCategory: fixture.projectCategory,
      zipCode: fixture.zipCode,
    });

    const estimated = estimate.totals.grandTotal;
    const actual = fixture.actualTotal;
    const absPctError = Math.abs(actual - estimated) / Math.max(1, actual);

    totalAbsolutePctError += absPctError;

    const category = fixture.projectCategory || estimate.detectedCategory;
    const existing = categoryMetrics.get(category) || { count: 0, sumAbsolutePctError: 0 };
    existing.count += 1;
    existing.sumAbsolutePctError += absPctError;
    categoryMetrics.set(category, existing);

    await postCalibrationEvent({
      baseUrl,
      token,
      tenantId,
      subscriberEmail,
      fixture,
      estimatedTotal: estimated,
      estimateId: estimate.estimateId,
    });

    console.log(
      `[backtest] ${category} | est=$${round(estimated)} actual=$${round(actual)} absErr=${round(absPctError * 100)}%`
    );
  }

  const overallMape = round((totalAbsolutePctError / Math.max(1, fixtures.length)) * 100);
  console.log(`\n[backtest] Overall MAPE: ${overallMape}% across ${fixtures.length} fixtures`);
  const overallPass = overallMape <= overallThreshold;
  console.log(`[backtest] Overall gate (${overallThreshold}%): ${overallPass ? 'PASS' : 'FAIL'}`);

  console.log('[backtest] Category MAPE:');
  const categories: BacktestReport['categories'] = [];
  for (const [category, metrics] of categoryMetrics.entries()) {
    const mape = round((metrics.sumAbsolutePctError / Math.max(1, metrics.count)) * 100);
    const pass = mape <= categoryThreshold;
    categories.push({
      category,
      fixtures: metrics.count,
      mapePercent: mape,
      pass,
    });
    console.log(`- ${category}: ${mape}% (${metrics.count} jobs) [${pass ? 'PASS' : 'FAIL'} <= ${categoryThreshold}%]`);
  }

  const report: BacktestReport = {
    generatedAt: new Date().toISOString(),
    fixtures: fixtures.length,
    tenantId,
    subscriberEmail,
    thresholds: {
      overallMapePercent: overallThreshold,
      categoryMapePercent: categoryThreshold,
    },
    overall: {
      mapePercent: overallMape,
      pass: overallPass,
    },
    categories,
  };

  const reportPath = parseReportPathArg();
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[backtest] Report written to ${reportPath}`);

  const categoriesPass = categories.every((item) => item.pass);
  if (!overallPass || !categoriesPass) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error('[backtest] Estimator backtest failed');
  console.error(error);
  process.exit(1);
});
