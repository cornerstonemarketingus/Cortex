import { NextResponse } from 'next/server';
import { llm } from '@/lib/llm/router';
import { buildFromTemplate, listTemplates } from '@/lib/estimator/templates';
import engine from '@/lib/estimator/engine';
import { computeTimeline } from '@/lib/estimator/timeline';

// ─── Trade keyword map ───────────────────────────────────────────────────────
const TRADE_KEYWORDS: Record<string, string[]> = {
  'residential-framing': ['fram', 'stud', 'lumber', 'wood frame', 'structure'],
  'commercial-framing': ['commercial fram', 'steel stud', 'light gauge', 'metal frame'],
  'roofing-shingle': ['roof', 'shingle', 'asphalt', 'reroof'],
  'roofing-metal': ['metal roof', 'standing seam', 'corrugated'],
  'windows-standard': ['window'],
  'windows-premium': ['premium window', 'casement', 'triple pane'],
  'doors-interior': ['interior door', 'bedroom door', 'closet door'],
  'doors-exterior': ['exterior door', 'entry door', 'front door'],
  'drywall-finish': ['drywall', 'sheetrock', 'gypsum', 'drywall finish'],
  'flooring-hardwood': ['hardwood', 'wood floor', 'oak floor', 'engineered'],
  'flooring-tile': ['tile floor', 'ceramic', 'porcelain', 'tile'],
  'concrete-foundation': ['concrete', 'foundation', 'slab', 'footing'],
  'painting-interior': ['paint', 'interior paint', 'wall paint'],
  'painting-exterior': ['exterior paint', 'house paint', 'siding paint'],
  'electrical-rough': ['electric', 'wiring', 'outlet', 'panel', 'breaker'],
  'plumbing-rough': ['plumb', 'pipe', 'drain', 'supply line', 'water'],
};

function detectTrades(input: string) {
  const txt = input.toLowerCase();
  const templates = listTemplates();
  const matched = new Set<string>();

  for (const [id, keywords] of Object.entries(TRADE_KEYWORDS)) {
    for (const kw of keywords) {
      if (txt.includes(kw)) {
        matched.add(id);
        break;
      }
    }
  }

  // If nothing explicit matched, fall back to best scoring template
  if (matched.size === 0) {
    const scored = templates.map((t) => {
      let score = 0;
      const terms = [...t.name.toLowerCase().split(' '), t.category];
      for (const term of terms) if (txt.includes(term)) score++;
      return { t, score };
    });
    scored.sort((a, b) => b.score - a.score);
    matched.add(scored[0].t.id);
  }

  return [...matched].slice(0, 3); // max 3 trades per request
}

function parseSqft(input: string): number {
  const m = input.match(/(\d[\d,]*)\s*(?:sq\.?\s*ft|square\s*feet|sqft)/i);
  if (m) return Math.min(Math.max(parseInt(m[1].replace(/,/g, ''), 10), 100), 100000);
  const m2 = input.match(/(\d{3,6})/);
  if (m2) return Math.min(Math.max(parseInt(m2[1], 10), 100), 100000);
  return 1500;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const input = ((body.input || body.prompt || '') as string).trim();
    const sqft = typeof body.sqft === 'number' ? body.sqft : parseSqft(input);
    const tradeIds = typeof body.tradeId === 'string' ? [body.tradeId] : detectTrades(input);

    const tradeEstimates = tradeIds.map((tradeId) => {
      const template = listTemplates().find((t) => t.id === tradeId) ?? listTemplates()[0];
      const estimateInput = buildFromTemplate(template.id, sqft);
      const breakdown = engine.calculateEstimate(estimateInput);
      return {
        tradeId: template.id,
        tradeName: template.name,
        category: template.category,
        sqft,
        breakdown: {
          materialsTotal: breakdown.materialsTotal,
          laborTotal: breakdown.laborTotal,
          subtotal: breakdown.subtotal,
          overheadAmount: breakdown.overheadAmount,
          taxAmount: breakdown.taxAmount,
          profitAmount: breakdown.profitAmount,
          total: breakdown.total,
          materialItems: breakdown.details.materials,
          laborItems: breakdown.details.labor,
        },
      };
    });

    const grandTotal = tradeEstimates.reduce((s, t) => s + t.breakdown.total, 0);
    const timeline = computeTimeline(tradeIds, sqft);

    // AI summary
    let summary = '';
    try {
      summary = await llm(
        `Summarize this multi-trade construction estimate for a contractor in 3 sentences. Trades: ${tradeEstimates.map((t) => t.tradeName).join(', ')}. Total: $${grandTotal.toFixed(0)}. Square footage: ${sqft}. Be specific and professional.`,
        'estimate',
        'You are a senior construction estimator. Give brief, accurate summaries.'
      );
    } catch {
      summary = `Estimate for ${tradeEstimates.map((t) => t.tradeName).join(', ')} at ${sqft.toLocaleString()} sqft. Grand total: $${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`;
    }

    return NextResponse.json({ trades: tradeEstimates, grandTotal, timeline, summary, sqft });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Estimate generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
