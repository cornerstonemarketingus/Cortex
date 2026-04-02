import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, buildFromTemplate, listTemplates, type TemplateId } from '@/lib/estimator/templates';
import type { EstimateTemplate } from '@/lib/estimator/templates';

const VALID_CATEGORIES: EstimateTemplate['category'][] = ['roofing', 'framing', 'windows', 'doors', 'finishing', 'utilities'];

/** GET /api/estimating/template?id=roofing-shingle&sqft=1200 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') as TemplateId | null;
  const sqft = parseFloat(searchParams.get('sqft') ?? '0');
  const rawCategory = searchParams.get('category');
  const category = VALID_CATEGORIES.includes(rawCategory as EstimateTemplate['category'])
    ? (rawCategory as EstimateTemplate['category'])
    : undefined;

  if (!id) {
    return NextResponse.json({ templates: listTemplates(category) });
  }

  const template = getTemplate(id);
  if (!template) {
    return NextResponse.json({ error: `Template "${id}" not found` }, { status: 404 });
  }

  const response: Record<string, unknown> = { template };

  if (sqft > 0) {
    const estimateInput = buildFromTemplate(id, sqft);
    response.estimateInput = estimateInput;
    response.sqft = sqft;
    response.estimated = true;
  }

  return NextResponse.json(response);
}
