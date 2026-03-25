export type EstimationMarketSignal = {
  source: 'bls' | 'regional';
  label: string;
  value: number;
  impactPercent: number;
  confidence: number;
  observedAt: string;
};

export type EstimationMarketEnvelope = {
  multiplier: number;
  confidence: number;
  signals: EstimationMarketSignal[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchBlsCpiYoY(): Promise<EstimationMarketSignal | null> {
  try {
    const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // CPI-U, U.S. city average, all items.
        seriesid: ['CUUR0000SA0'],
        startyear: `${new Date().getUTCFullYear() - 2}`,
        endyear: `${new Date().getUTCFullYear()}`,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          Results?: {
            series?: Array<{
              data?: Array<{ year?: string; period?: string; value?: string }>;
            }>;
          };
        }
      | null;

    const rows = payload?.Results?.series?.[0]?.data || [];
    const monthlyRows = rows
      .filter((row) => typeof row.period === 'string' && /^M\d{2}$/.test(row.period))
      .map((row) => ({
        year: Number(row.year),
        month: Number((row.period || '').slice(1)),
        value: parseNumber(row.value),
      }))
      .filter((row): row is { year: number; month: number; value: number } => Number.isFinite(row.year) && Number.isFinite(row.month) && row.value !== null)
      .sort((a, b) => a.year - b.year || a.month - b.month);

    if (monthlyRows.length < 13) {
      return null;
    }

    const latest = monthlyRows[monthlyRows.length - 1];
    const priorYear = monthlyRows[monthlyRows.length - 13];
    if (!latest || !priorYear || priorYear.value <= 0) {
      return null;
    }

    const yoyPercent = ((latest.value - priorYear.value) / priorYear.value) * 100;

    return {
      source: 'bls',
      label: 'BLS CPI YoY',
      value: Number(yoyPercent.toFixed(2)),
      impactPercent: Number(clamp(yoyPercent * 0.35, -8, 8).toFixed(2)),
      confidence: 0.82,
      observedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function buildRegionalPressure(zipCode?: string): EstimationMarketSignal | null {
  if (!zipCode || !/^\d{5}$/.test(zipCode.trim())) {
    return null;
  }

  const prefix = Number(zipCode.slice(0, 1));
  if (!Number.isFinite(prefix)) {
    return null;
  }

  let impactPercent = 0;
  let label = 'Regional baseline pressure';

  if (prefix <= 2) {
    impactPercent = 6;
    label = 'Regional labor pressure (Northeast)';
  } else if (prefix <= 4) {
    impactPercent = 3.5;
    label = 'Regional labor pressure (Mid-Atlantic/South)';
  } else if (prefix <= 6) {
    impactPercent = 1;
    label = 'Regional labor pressure (Midwest)';
  } else if (prefix <= 8) {
    impactPercent = 2.5;
    label = 'Regional labor pressure (Mountain/West)';
  } else {
    impactPercent = 4.5;
    label = 'Regional labor pressure (Pacific)';
  }

  return {
    source: 'regional',
    label,
    value: impactPercent,
    impactPercent,
    confidence: 0.7,
    observedAt: new Date().toISOString(),
  };
}

export async function loadEstimationMarketEnvelope(zipCode?: string): Promise<EstimationMarketEnvelope> {
  const [blsSignal] = await Promise.all([fetchBlsCpiYoY()]);
  const regionalSignal = buildRegionalPressure(zipCode);

  const signals = [blsSignal, regionalSignal].filter((signal): signal is EstimationMarketSignal => signal !== null);

  if (signals.length === 0) {
    return {
      multiplier: 1,
      confidence: 0.5,
      signals: [],
    };
  }

  const blendedImpact = signals.reduce((sum, signal) => sum + signal.impactPercent, 0);
  const multiplier = clamp(1 + blendedImpact / 100, 0.88, 1.2);
  const confidence = clamp(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length, 0.55, 0.9);

  return {
    multiplier: Number(multiplier.toFixed(4)),
    confidence: Number(confidence.toFixed(2)),
    signals,
  };
}
