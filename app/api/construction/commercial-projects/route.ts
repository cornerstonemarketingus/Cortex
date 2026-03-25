import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';

export const runtime = 'nodejs';

type CommercialProject = {
  id: string;
  title: string;
  zipCode: string;
  city: string;
  scope: string;
  estimatedValue: string;
  bidDue: string;
  source: string;
  status: 'open' | 'closing-soon';
};

const PROJECT_TEMPLATES: Array<Omit<CommercialProject, 'id' | 'zipCode'>> = [
  {
    title: 'Municipal Library Roof and Envelope Upgrade',
    city: 'Regional Metro',
    scope: 'Roofing, weatherproofing, insulation, and exterior repairs',
    estimatedValue: '$420,000 - $560,000',
    bidDue: '2026-04-06',
    source: 'BidClerk-style regional feed',
    status: 'open',
  },
  {
    title: 'Retail Center HVAC Modernization',
    city: 'Regional Metro',
    scope: 'HVAC replacement, controls, and commissioning',
    estimatedValue: '$310,000 - $470,000',
    bidDue: '2026-04-02',
    source: 'iSqFt-style project bulletin',
    status: 'open',
  },
  {
    title: 'School District Flooring and Interior Paint Package',
    city: 'Regional Metro',
    scope: 'Flooring replacement, prep, painting, and cleanup',
    estimatedValue: '$180,000 - $260,000',
    bidDue: '2026-03-29',
    source: 'Public procurement board',
    status: 'closing-soon',
  },
  {
    title: 'Healthcare Clinic Electrical + Low Voltage Refresh',
    city: 'Regional Metro',
    scope: 'Panel upgrades, wiring, low-voltage network, testing',
    estimatedValue: '$230,000 - $350,000',
    bidDue: '2026-04-11',
    source: 'Commercial project exchange',
    status: 'open',
  },
];

function buildProjects(zipCode: string): CommercialProject[] {
  return PROJECT_TEMPLATES.map((item, index) => ({
    ...item,
    id: `${zipCode}-${index + 1}`,
    zipCode,
  }));
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const url = new URL(request.url);
    const zipCode = parseOptionalString(url.searchParams.get('zipCode')) || '55123';
    const limitRaw = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(Math.floor(limitRaw), 20)) : 8;

    const projects = buildProjects(zipCode).slice(0, limit);

    return jsonResponse({
      zipCode,
      total: projects.length,
      projects,
      notes:
        'This endpoint returns a normalized commercial bid feed model. Connect licensed data providers for live production listings.',
    });
  });
}
