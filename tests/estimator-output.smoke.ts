import assert from 'node:assert/strict';
import { POST } from '@/app/api/estimate/generate/route';

const UNSAFE_OUTPUT = /configure\s+(?:openai|anthropic)_api_key|received task\s+["']?estimate|\[local model\]/i;

async function runCase(label: string, body: Record<string, unknown>) {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.LLM_PROVIDER_OVERRIDE;

  const request = new Request('http://localhost/api/estimate/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const response = await POST(request);
  const payload = await response.json() as {
    summary?: string;
    grandTotal?: number;
    sqft?: number;
    trades?: Array<{ tradeName?: string }>;
    error?: string;
  };

  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(payload, null, 2));

  assert.equal(response.status, 200, `Expected 200, received ${response.status}: ${payload.error ?? 'unknown error'}`);
  assert.equal(typeof payload.summary, 'string', 'Estimator summary must be a string');
  assert.ok(payload.summary && payload.summary.length > 30, 'Estimator summary must be useful');
  assert.ok(!UNSAFE_OUTPUT.test(payload.summary), `Unsafe provider/debug output leaked: ${payload.summary}`);
  assert.ok(Number.isFinite(payload.grandTotal) && Number(payload.grandTotal) > 0, 'Grand total must be positive');
  assert.ok(Array.isArray(payload.trades) && payload.trades.length > 0, 'At least one trade must be returned');

  return payload;
}

const framing = await runCase('framing estimate without API keys', {
  input: '1000sqft framing in 90210',
});

assert.equal(framing.sqft, 1000, 'Square footage parsing failed');
assert.match(framing.summary ?? '', /Residential Framing/i, 'Expected framing trade in summary');
assert.match(framing.summary ?? '', /\$[\d,]+/, 'Expected formatted total in summary');

const roofing = await runCase('roof estimate without API keys', {
  input: 'I need a roof replacement for 2000 sqft in 55123 zip code',
});

assert.equal(roofing.sqft, 2000, 'Roof square footage parsing failed');
assert.match(roofing.summary ?? '', /Asphalt Shingle Roofing/i, 'Expected roofing trade in summary');

console.log('\nEstimator smoke test passed: real route output is safe and usable without hosted model credentials.');
