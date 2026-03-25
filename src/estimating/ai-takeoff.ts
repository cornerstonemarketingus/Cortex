import { randomUUID } from 'node:crypto';

export const PROJECT_CATEGORIES = [
  'deck',
  'bathroom-remodel',
  'kitchen-gut',
  'roof-replacement',
  'basement-finish',
  'general-construction',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export type UploadedPlanFile = {
  name: string;
  type: string;
  size: number;
};

export type TakeoffInput = {
  files: UploadedPlanFile[];
  description?: string;
  projectCategory?: string;
  zipCode?: string;
};

export type BidInput = {
  description: string;
  projectCategory?: string;
  zipCode?: string;
};

export type MaterialLine = {
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
};

export type LaborLine = {
  trade: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
};

export type EstimateResult = {
  estimateId: string;
  generatedAt: string;
  mode: 'plan-takeoff' | 'bid-generator';
  engine: {
    version: string;
    calibration: string;
    strategy: string;
  };
  detectedCategory: ProjectCategory;
  categoryLabel: string;
  confidence: number;
  confidenceBreakdown: {
    categoryDetection: number;
    geometrySignal: number;
    scopeCompleteness: number;
    regionalCalibration: number;
    overall: number;
  };
  regionalFactor: number;
  zipCode?: string;
  inputSummary: string;
  calibrationBand: {
    low: number;
    expected: number;
    high: number;
    variancePercent: number;
  };
  riskAdjustments: Array<{
    factor: string;
    impactPercent: number;
    reason: string;
  }>;
  materials: MaterialLine[];
  labor: LaborLine[];
  totals: {
    materials: number;
    labor: number;
    overhead: number;
    profit: number;
    grandTotal: number;
  };
  margin: {
    overheadPercent: number;
    profitPercent: number;
  };
  timeline: {
    estimatedDays: number;
    crewSize: number;
  };
  assumptions: string[];
  proposalMarkdown: string;
};

type Geometry = {
  areaSqFt: number;
  perimeterFt: number;
};

type AreaBounds = {
  min: number;
  max: number;
};

type CostPerSqFtBounds = {
  min: number;
  max: number;
};

type EstimatorSignals = {
  complexityScore: number;
  riskScore: number;
  scopeCompleteness: number;
  categoryConfidence: number;
  geometryConfidence: number;
  regionalConfidence: number;
  materialMultiplier: number;
  laborMultiplier: number;
  riskAdjustments: Array<{
    factor: string;
    impactPercent: number;
    reason: string;
  }>;
};

type MaterialTemplateLine = {
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
};

type LaborTemplateLine = {
  trade: string;
  hours: number;
  hourlyRate: number;
};

type CategoryTemplate = {
  label: string;
  defaultAreaSqFt: number;
  crewSize: number;
  overheadPercent: number;
  profitPercent: number;
  assumptions: string[];
  buildMaterials: (geometry: Geometry) => MaterialTemplateLine[];
  buildLabor: (geometry: Geometry) => LaborTemplateLine[];
};

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  deck: 'Deck Build / Exterior Carpentry',
  'bathroom-remodel': 'Bathroom Remodel',
  'kitchen-gut': 'Kitchen Gut Remodel',
  'roof-replacement': 'Asphalt Roof Replacement',
  'basement-finish': 'Basement Finish',
  'general-construction': 'General Construction Scope',
};

const CATEGORY_AREA_BOUNDS: Record<ProjectCategory, AreaBounds> = {
  deck: { min: 64, max: 2000 },
  'bathroom-remodel': { min: 30, max: 400 },
  'kitchen-gut': { min: 80, max: 900 },
  'roof-replacement': { min: 600, max: 12000 },
  'basement-finish': { min: 200, max: 4000 },
  'general-construction': { min: 60, max: 25000 },
};

const CATEGORY_COST_PER_SQFT_BOUNDS: Record<ProjectCategory, CostPerSqFtBounds> = {
  deck: { min: 35, max: 150 },
  'bathroom-remodel': { min: 125, max: 520 },
  'kitchen-gut': { min: 110, max: 420 },
  'roof-replacement': { min: 7.5, max: 22 },
  'basement-finish': { min: 45, max: 220 },
  'general-construction': { min: 20, max: 260 },
};

export const EXAMPLE_BID_PROMPTS = [
  '16x16 treated lumber deck with composite railing, stairs, 6ft off ground',
  'Master bath remodel - new tile, vanity, shower glass, lighting and paint',
  'Kitchen gut: cabinets, countertops, appliances, flooring and backsplash',
  'Asphalt shingle roof replacement, 2,400 sq ft with tear-off and dump fees',
  'Basement finish 800 sq ft - drywall, flooring, lighting and trim',
];

const CATEGORY_TEMPLATES: Record<ProjectCategory, CategoryTemplate> = {
  deck: {
    label: CATEGORY_LABELS.deck,
    defaultAreaSqFt: 256,
    crewSize: 3,
    overheadPercent: 12,
    profitPercent: 18,
    assumptions: [
      'Existing site access supports standard material delivery.',
      'No extraordinary soil or permitting constraints are included.',
      'Composite railing scope assumes one perimeter guard system and one stair run.',
    ],
    buildMaterials: (geometry) => {
      const area = geometry.areaSqFt;
      const perimeter = geometry.perimeterFt;
      return [
        { item: 'Pressure-treated framing lumber', quantity: area * 4.2, unit: 'board ft', unitCost: 3.2 },
        { item: 'Decking boards (treated/composite mix)', quantity: area * 1.12, unit: 'sq ft', unitCost: 8.5 },
        { item: 'Composite railing system', quantity: perimeter, unit: 'linear ft', unitCost: 42 },
        { item: 'Footings and concrete bags', quantity: Math.max(6, perimeter / 8), unit: 'set', unitCost: 34 },
        { item: 'Hardware, fasteners, connectors', quantity: area * 0.18, unit: 'allowance', unitCost: 22 },
      ];
    },
    buildLabor: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { trade: 'Carpentry crew', hours: area * 0.95, hourlyRate: 78 },
        { trade: 'Site prep and layout', hours: area * 0.2, hourlyRate: 65 },
        { trade: 'Finish and punch list', hours: area * 0.12, hourlyRate: 72 },
      ];
    },
  },
  'bathroom-remodel': {
    label: CATEGORY_LABELS['bathroom-remodel'],
    defaultAreaSqFt: 75,
    crewSize: 2,
    overheadPercent: 14,
    profitPercent: 20,
    assumptions: [
      'Fixture relocation is limited to short runs within existing wet wall zones.',
      'Tile scope includes standard prep and waterproofing in wet areas.',
      'Electrical panel has adequate capacity for updated bath circuits.',
    ],
    buildMaterials: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { item: 'Porcelain tile package', quantity: area * 1.15, unit: 'sq ft', unitCost: 11.5 },
        { item: 'Vanity and countertop', quantity: 1, unit: 'set', unitCost: 2450 },
        { item: 'Shower glass and hardware', quantity: 1, unit: 'set', unitCost: 1750 },
        { item: 'Plumbing rough/final materials', quantity: 1, unit: 'allowance', unitCost: 1650 },
        { item: 'Lighting, fan, electrical trim', quantity: 1, unit: 'allowance', unitCost: 1200 },
      ];
    },
    buildLabor: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { trade: 'Demo and framing adjustments', hours: area * 0.8, hourlyRate: 70 },
        { trade: 'Tile and finish install', hours: area * 1.4, hourlyRate: 82 },
        { trade: 'Plumbing and electrical finals', hours: area * 0.55, hourlyRate: 88 },
      ];
    },
  },
  'kitchen-gut': {
    label: CATEGORY_LABELS['kitchen-gut'],
    defaultAreaSqFt: 190,
    crewSize: 3,
    overheadPercent: 14,
    profitPercent: 21,
    assumptions: [
      'Scope includes standard appliance package and mid-tier finish selections.',
      'Major structural wall moves are excluded unless explicitly documented.',
      'Schedule assumes cabinet lead times are managed before install start.',
    ],
    buildMaterials: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { item: 'Cabinet package', quantity: Math.max(12, area / 12), unit: 'linear ft', unitCost: 380 },
        { item: 'Countertops', quantity: Math.max(35, area / 3.5), unit: 'sq ft', unitCost: 92 },
        { item: 'Appliance allowance', quantity: 1, unit: 'set', unitCost: 6900 },
        { item: 'Flooring and underlayment', quantity: area * 1.08, unit: 'sq ft', unitCost: 9.5 },
        { item: 'Backsplash and finish materials', quantity: Math.max(45, area / 2.7), unit: 'sq ft', unitCost: 16 },
      ];
    },
    buildLabor: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { trade: 'Demolition and prep', hours: area * 0.45, hourlyRate: 70 },
        { trade: 'Cabinet and millwork install', hours: area * 0.85, hourlyRate: 84 },
        { trade: 'Electrical and plumbing integration', hours: area * 0.38, hourlyRate: 92 },
        { trade: 'Finish carpentry and paint', hours: area * 0.3, hourlyRate: 76 },
      ];
    },
  },
  'roof-replacement': {
    label: CATEGORY_LABELS['roof-replacement'],
    defaultAreaSqFt: 2400,
    crewSize: 4,
    overheadPercent: 11,
    profitPercent: 17,
    assumptions: [
      'Pricing assumes asphalt architectural shingle system with standard underlayment.',
      'Decking replacement allowance covers up to 5 percent of roof area.',
      'Includes disposal and site protection for a single mobilization event.',
    ],
    buildMaterials: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { item: 'Architectural shingles', quantity: area * 1.1, unit: 'sq ft', unitCost: 4.4 },
        { item: 'Synthetic underlayment and ice shield', quantity: area * 1.06, unit: 'sq ft', unitCost: 1.45 },
        { item: 'Ridge vent and ventilation accessories', quantity: Math.max(40, Math.sqrt(area) * 3), unit: 'linear ft', unitCost: 9.8 },
        { item: 'Flashing, drip edge, sealants', quantity: Math.max(1, area / 800), unit: 'allowance', unitCost: 1325 },
        { item: 'Dumpsters and disposal', quantity: Math.max(1, area / 2200), unit: 'unit', unitCost: 880 },
      ];
    },
    buildLabor: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { trade: 'Tear-off and cleanup crew', hours: area * 0.06, hourlyRate: 66 },
        { trade: 'Roof install crew', hours: area * 0.085, hourlyRate: 78 },
        { trade: 'Detailing and final QA', hours: area * 0.018, hourlyRate: 72 },
      ];
    },
  },
  'basement-finish': {
    label: CATEGORY_LABELS['basement-finish'],
    defaultAreaSqFt: 800,
    crewSize: 3,
    overheadPercent: 13,
    profitPercent: 19,
    assumptions: [
      'Scope assumes existing utilities allow standard framing and finish build-out.',
      'Includes code-compliant egress and life safety checks within existing layout.',
      'Moisture mitigation is limited to basic prep and sealing, not major remediation.',
    ],
    buildMaterials: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { item: 'Framing lumber and insulation', quantity: area * 1.05, unit: 'sq ft', unitCost: 6.4 },
        { item: 'Drywall and finishing materials', quantity: area * 1.18, unit: 'sq ft', unitCost: 4.8 },
        { item: 'Flooring package', quantity: area * 1.06, unit: 'sq ft', unitCost: 7.9 },
        { item: 'Lighting and electrical materials', quantity: Math.max(1, area / 120), unit: 'allowance', unitCost: 680 },
        { item: 'Doors, trim, and paint materials', quantity: Math.max(1, area / 180), unit: 'allowance', unitCost: 910 },
      ];
    },
    buildLabor: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { trade: 'Framing and rough-in', hours: area * 0.28, hourlyRate: 74 },
        { trade: 'Drywall and finishing', hours: area * 0.32, hourlyRate: 78 },
        { trade: 'Electrical and trim', hours: area * 0.14, hourlyRate: 86 },
        { trade: 'Flooring and paint', hours: area * 0.17, hourlyRate: 72 },
      ];
    },
  },
  'general-construction': {
    label: CATEGORY_LABELS['general-construction'],
    defaultAreaSqFt: 350,
    crewSize: 2,
    overheadPercent: 12,
    profitPercent: 18,
    assumptions: [
      'General scope pricing uses blended residential construction rates.',
      'Final quote should be field-verified against complete plans and site walk.',
      'Permit and jurisdiction fees are estimated as allowances only.',
    ],
    buildMaterials: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { item: 'Core build materials allowance', quantity: area, unit: 'sq ft', unitCost: 18.5 },
        { item: 'Finish materials allowance', quantity: area, unit: 'sq ft', unitCost: 9.75 },
        { item: 'Hardware and incidentals', quantity: Math.max(1, area / 200), unit: 'allowance', unitCost: 780 },
      ];
    },
    buildLabor: (geometry) => {
      const area = geometry.areaSqFt;
      return [
        { trade: 'General construction labor', hours: area * 0.34, hourlyRate: 74 },
        { trade: 'Skilled trade allowance', hours: area * 0.12, hourlyRate: 92 },
      ];
    },
  },
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeCategory(value: string | undefined): ProjectCategory | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'auto' || normalized === 'auto-detect' || normalized === 'auto-detect from plans') {
    return undefined;
  }

  return PROJECT_CATEGORIES.includes(normalized as ProjectCategory)
    ? (normalized as ProjectCategory)
    : undefined;
}

function detectCategoryFromText(text: string): ProjectCategory {
  const value = text.toLowerCase();
  if (/deck|railing|stairs|joist|trex|composite/.test(value)) return 'deck';
  if (/bath|shower|vanity|tile bath|powder room/.test(value)) return 'bathroom-remodel';
  if (/kitchen|cabinet|backsplash|countertop|appliance/.test(value)) return 'kitchen-gut';
  if (/roof|shingle|tear-off|ridge vent/.test(value)) return 'roof-replacement';
  if (/basement|drywall|egress|finished lower level/.test(value)) return 'basement-finish';
  return 'general-construction';
}

function detectCategoryFromFiles(files: UploadedPlanFile[]): ProjectCategory | null {
  const fileText = files.map((file) => file.name.toLowerCase()).join(' ');
  if (!fileText) return null;
  if (/deck|patio|porch/.test(fileText)) return 'deck';
  if (/bath|powder/.test(fileText)) return 'bathroom-remodel';
  if (/kitchen/.test(fileText)) return 'kitchen-gut';
  if (/roof|elevation|shingle/.test(fileText)) return 'roof-replacement';
  if (/basement|lower-level/.test(fileText)) return 'basement-finish';
  return null;
}

function parseRectangle(text: string): { width: number; length: number } | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const width = Number(match[1]);
  const length = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(length) || width <= 0 || length <= 0) return null;
  return { width, length };
}

function parseAreaFromText(text: string): number | null {
  const match = text.match(/(\d{2,5}(?:\.\d+)?)\s*(sq\.?\s*ft|square\s*feet|sf)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseRoofingSquares(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(roofing\s*)?squares?\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function normalizeAreaSqFt(category: ProjectCategory, areaSqFt: number): number {
  const bounds = CATEGORY_AREA_BOUNDS[category];
  return clamp(areaSqFt, bounds.min, bounds.max);
}

function inferGeometry(category: ProjectCategory, text: string): Geometry {
  const template = CATEGORY_TEMPLATES[category];
  const roofingSquares = category === 'roof-replacement' ? parseRoofingSquares(text) : null;

  if (roofingSquares !== null) {
    const areaSqFt = normalizeAreaSqFt(category, roofingSquares * 100);
    return {
      areaSqFt,
      perimeterFt: 4 * Math.sqrt(areaSqFt),
    };
  }

  const rect = parseRectangle(text);
  if (rect) {
    const areaSqFt = normalizeAreaSqFt(category, rect.width * rect.length);
    const perimeterFt = 2 * (rect.width + rect.length);
    return {
      areaSqFt,
      perimeterFt,
    };
  }

  const areaFromText = parseAreaFromText(text);
  const areaSqFt = normalizeAreaSqFt(category, areaFromText ?? template.defaultAreaSqFt);
  return {
    areaSqFt,
    perimeterFt: 4 * Math.sqrt(areaSqFt),
  };
}

function applyCostPerSqFtGuardrail(params: {
  category: ProjectCategory;
  geometry: Geometry;
  totals: {
    materials: number;
    labor: number;
    overhead: number;
    profit: number;
    grandTotal: number;
  };
  materials: MaterialLine[];
  labor: LaborLine[];
  overheadPercent: number;
  profitPercent: number;
}): { adjusted: boolean; note: string | null } {
  const area = Math.max(params.geometry.areaSqFt, 1);
  const bounds = CATEGORY_COST_PER_SQFT_BOUNDS[params.category];
  const currentCostPerSqFt = params.totals.grandTotal / area;

  const targetCostPerSqFt = clamp(currentCostPerSqFt, bounds.min, bounds.max);
  const targetGrandTotal = roundMoney(targetCostPerSqFt * area);

  if (Math.abs(targetGrandTotal - params.totals.grandTotal) < 1) {
    return { adjusted: false, note: null };
  }

  const overheadRate = params.overheadPercent / 100;
  const profitRate = params.profitPercent / 100;
  const multiplierDenominator = (1 + overheadRate) * (1 + profitRate);
  const targetSubtotal = roundMoney(targetGrandTotal / multiplierDenominator);

  const currentSubtotal = Math.max(params.totals.materials + params.totals.labor, 1);
  const lineScale = targetSubtotal / currentSubtotal;

  params.materials.forEach((line) => {
    line.unitCost = roundMoney(line.unitCost * lineScale);
    line.totalCost = roundMoney(line.totalCost * lineScale);
  });

  params.labor.forEach((line) => {
    line.hourlyRate = roundMoney(line.hourlyRate * lineScale);
    line.totalCost = roundMoney(line.totalCost * lineScale);
  });

  params.totals.materials = roundMoney(params.materials.reduce((sum, line) => sum + line.totalCost, 0));
  params.totals.labor = roundMoney(params.labor.reduce((sum, line) => sum + line.totalCost, 0));

  const subtotal = params.totals.materials + params.totals.labor;
  params.totals.overhead = roundMoney(subtotal * overheadRate);
  params.totals.profit = roundMoney((subtotal + params.totals.overhead) * profitRate);
  params.totals.grandTotal = roundMoney(subtotal + params.totals.overhead + params.totals.profit);

  return {
    adjusted: true,
    note: `Estimator guardrail normalized total to realistic ${params.category} band ($${bounds.min.toFixed(2)}-$${bounds.max.toFixed(2)} per sq ft).`,
  };
}

function regionFactorFromZip(zipCode?: string): number {
  if (!zipCode) return 1;
  const cleaned = zipCode.trim();
  if (!/^\d{5}$/.test(cleaned)) return 1;

  const prefix = Number(cleaned.slice(0, 1));
  if (!Number.isFinite(prefix)) return 1;

  if (prefix <= 2) return 1.17;
  if (prefix <= 4) return 1.09;
  if (prefix <= 6) return 1;
  if (prefix <= 8) return 0.95;
  return 1.03;
}

function microRegionCalibration(zipCode?: string): number {
  if (!zipCode) return 1;
  const cleaned = zipCode.trim();
  if (!/^\d{5}$/.test(cleaned)) return 1;

  const prefix3 = Number(cleaned.slice(0, 3));
  if (!Number.isFinite(prefix3)) return 1;

  if (prefix3 >= 100 && prefix3 <= 129) return 1.08;
  if (prefix3 >= 200 && prefix3 <= 249) return 1.05;
  if (prefix3 >= 550 && prefix3 <= 569) return 0.98;
  if (prefix3 >= 900 && prefix3 <= 919) return 1.12;
  return 1;
}

function buildEstimatorSignals(params: {
  category: ProjectCategory;
  text: string;
  geometry: Geometry;
  explicitCategory: boolean;
  hasFiles: boolean;
  zipCode?: string;
}): EstimatorSignals {
  const text = params.text.toLowerCase();

  const complexityKeywords = [
    'custom',
    'luxury',
    'structural',
    'permit',
    'inspection',
    'multistory',
    'premium finish',
    'complex',
    'historic',
    'asbestos',
  ];
  const riskKeywords = ['unknown', 'hidden damage', 'water damage', 'rot', 'change order', 'unverified', 'rush'];

  const complexityHits = complexityKeywords.filter((keyword) => text.includes(keyword)).length;
  const riskHits = riskKeywords.filter((keyword) => text.includes(keyword)).length;

  const geometryExpected = CATEGORY_TEMPLATES[params.category].defaultAreaSqFt;
  const geometryDeltaRatio = Math.abs(params.geometry.areaSqFt - geometryExpected) / Math.max(geometryExpected, 1);

  const scopeCompleteness = clamp(
    0.55 +
      (params.hasFiles ? 0.18 : 0) +
      (params.explicitCategory ? 0.12 : 0) +
      (text.length > 120 ? 0.1 : 0) +
      (text.length > 220 ? 0.05 : 0),
    0.45,
    0.97
  );

  const categoryConfidence = clamp(params.explicitCategory ? 0.96 : params.hasFiles ? 0.88 : 0.8, 0.5, 0.99);
  const geometryConfidence = clamp(0.94 - geometryDeltaRatio * 0.4, 0.52, 0.96);
  const regionalConfidence = params.zipCode ? 0.92 : 0.76;

  const complexityScore = clamp(0.35 + complexityHits * 0.09 + geometryDeltaRatio * 0.15, 0.2, 0.95);
  const riskScore = clamp(0.2 + riskHits * 0.11 + (params.hasFiles ? -0.04 : 0.06), 0.12, 0.95);

  const materialMultiplier = clamp(1 + complexityScore * 0.08 + riskScore * 0.05, 0.92, 1.22);
  const laborMultiplier = clamp(1 + complexityScore * 0.12 + riskScore * 0.07, 0.9, 1.28);

  const riskAdjustments = [
    {
      factor: 'complexity',
      impactPercent: roundMoney((materialMultiplier - 1) * 100),
      reason: `Complexity indicators detected: ${complexityHits}`,
    },
    {
      factor: 'execution-risk',
      impactPercent: roundMoney((laborMultiplier - 1) * 100),
      reason: `Risk indicators detected: ${riskHits}`,
    },
  ];

  return {
    complexityScore,
    riskScore,
    scopeCompleteness,
    categoryConfidence,
    geometryConfidence,
    regionalConfidence,
    materialMultiplier,
    laborMultiplier,
    riskAdjustments,
  };
}

function buildCalibrationBand(expectedTotal: number, signals: EstimatorSignals) {
  const variancePercent = clamp(
    8 +
      (1 - signals.scopeCompleteness) * 20 +
      signals.riskScore * 12 +
      signals.complexityScore * 10,
    8,
    42
  );
  const delta = expectedTotal * (variancePercent / 100);

  return {
    low: roundMoney(expectedTotal - delta),
    expected: roundMoney(expectedTotal),
    high: roundMoney(expectedTotal + delta),
    variancePercent: roundMoney(variancePercent),
  };
}

function buildProposalMarkdown(result: EstimateResult): string {
  const materialsLine = result.materials
    .slice(0, 4)
    .map((line) => `- ${line.item}: ${line.quantity.toFixed(2)} ${line.unit}`)
    .join('\n');

  const laborLine = result.labor
    .map((line) => `- ${line.trade}: ${line.hours.toFixed(1)}h @ $${line.hourlyRate}/h`)
    .join('\n');

  return [
    `# ${result.categoryLabel} Proposal`,
    '',
    `Estimate ID: ${result.estimateId}`,
    `Confidence: ${(result.confidence * 100).toFixed(1)}%`,
    `Pricing Region Factor: ${result.regionalFactor.toFixed(2)}`,
    '',
    '## Scope Summary',
    result.inputSummary,
    '',
    '## Material Highlights',
    materialsLine,
    '',
    '## Labor Breakdown',
    laborLine,
    '',
    '## Financial Summary',
    `- Materials: $${result.totals.materials.toFixed(2)}`,
    `- Labor: $${result.totals.labor.toFixed(2)}`,
    `- Overhead: $${result.totals.overhead.toFixed(2)}`,
    `- Profit: $${result.totals.profit.toFixed(2)}`,
    `- Total Bid: $${result.totals.grandTotal.toFixed(2)}`,
    '',
    '## Assumptions',
    ...result.assumptions.map((assumption) => `- ${assumption}`),
    '',
    '## Next Steps',
    '- Field-verify dimensions and site conditions.',
    '- Confirm selected finish level and allowance choices.',
    '- Issue final contract proposal with schedule milestones.',
  ].join('\n');
}

function finalizeEstimate(
  mode: 'plan-takeoff' | 'bid-generator',
  category: ProjectCategory,
  confidence: number,
  regionalFactor: number,
  zipCode: string | undefined,
  inputSummary: string,
  geometry: Geometry,
  signals: EstimatorSignals
): EstimateResult {
  const template = CATEGORY_TEMPLATES[category];

  const materials: MaterialLine[] = template
    .buildMaterials(geometry)
    .map((line) => ({
      ...line,
      quantity: roundMoney(line.quantity),
      unitCost: roundMoney(line.unitCost * regionalFactor * signals.materialMultiplier),
      totalCost: roundMoney(line.quantity * line.unitCost * regionalFactor * signals.materialMultiplier),
    }));

  const labor: LaborLine[] = template
    .buildLabor(geometry)
    .map((line) => ({
      ...line,
      hours: roundMoney(line.hours),
      hourlyRate: roundMoney(line.hourlyRate * regionalFactor * signals.laborMultiplier),
      totalCost: roundMoney(line.hours * line.hourlyRate * regionalFactor * signals.laborMultiplier),
    }));

  const materialsTotal = roundMoney(materials.reduce((sum, line) => sum + line.totalCost, 0));
  const laborTotal = roundMoney(labor.reduce((sum, line) => sum + line.totalCost, 0));
  const subtotal = materialsTotal + laborTotal;

  const overhead = roundMoney(subtotal * (template.overheadPercent / 100));
  const profit = roundMoney((subtotal + overhead) * (template.profitPercent / 100));
  const grandTotal = roundMoney(subtotal + overhead + profit);

  const result: EstimateResult = {
    estimateId: randomUUID(),
    generatedAt: new Date().toISOString(),
    mode,
    engine: {
      version: 'estimator-v1.3',
      calibration: 'multi-signal-risk-calibration',
      strategy: 'category + geometry + regional + complexity + risk ensemble',
    },
    detectedCategory: category,
    categoryLabel: template.label,
    confidence: clamp(confidence, 0.5, 0.99),
    confidenceBreakdown: {
      categoryDetection: roundMoney(signals.categoryConfidence),
      geometrySignal: roundMoney(signals.geometryConfidence),
      scopeCompleteness: roundMoney(signals.scopeCompleteness),
      regionalCalibration: roundMoney(signals.regionalConfidence),
      overall: roundMoney(confidence),
    },
    regionalFactor,
    zipCode,
    inputSummary,
    calibrationBand: {
      low: 0,
      expected: 0,
      high: 0,
      variancePercent: 0,
    },
    riskAdjustments: signals.riskAdjustments,
    materials,
    labor,
    totals: {
      materials: materialsTotal,
      labor: laborTotal,
      overhead,
      profit,
      grandTotal,
    },
    margin: {
      overheadPercent: template.overheadPercent,
      profitPercent: template.profitPercent,
    },
    timeline: {
      estimatedDays: Math.max(2, Math.round((laborTotal / (template.crewSize * 8 * 85)) * 10)),
      crewSize: template.crewSize,
    },
    assumptions: [...template.assumptions],
    proposalMarkdown: '',
  };

  const guardrail = applyCostPerSqFtGuardrail({
    category,
    geometry,
    totals: result.totals,
    materials: result.materials,
    labor: result.labor,
    overheadPercent: template.overheadPercent,
    profitPercent: template.profitPercent,
  });

  if (guardrail.adjusted && guardrail.note) {
    result.assumptions.push(guardrail.note);
    result.riskAdjustments.push({
      factor: 'market-sanity-guardrail',
      impactPercent: 0,
      reason: guardrail.note,
    });
  }

  result.calibrationBand = buildCalibrationBand(result.totals.grandTotal, signals);

  result.proposalMarkdown = buildProposalMarkdown(result);
  return result;
}

export function getProjectCategoryOptions() {
  return PROJECT_CATEGORIES.map((category) => ({
    id: category,
    label: CATEGORY_LABELS[category],
  }));
}

export function createTakeoffEstimate(input: TakeoffInput): EstimateResult {
  const description = input.description?.trim() || '';
  const textSignal = [description, ...input.files.map((file) => file.name)].join(' ').trim();

  const explicitCategory = normalizeCategory(input.projectCategory);
  const categoryFromFiles = detectCategoryFromFiles(input.files);
  const detectedCategory = explicitCategory || categoryFromFiles || detectCategoryFromText(textSignal);

  const baseConfidence = explicitCategory
    ? 0.93
    : categoryFromFiles
    ? 0.86
    : description
    ? 0.79
    : 0.68;

  const geometry = inferGeometry(detectedCategory, textSignal);
  const regionalFactor = regionFactorFromZip(input.zipCode) * microRegionCalibration(input.zipCode);

  const signals = buildEstimatorSignals({
    category: detectedCategory,
    text: textSignal,
    geometry,
    explicitCategory: Boolean(explicitCategory),
    hasFiles: input.files.length > 0,
    zipCode: input.zipCode,
  });

  const confidence = clamp(
    baseConfidence * 0.55 +
      signals.scopeCompleteness * 0.2 +
      signals.geometryConfidence * 0.15 +
      signals.categoryConfidence * 0.1,
    0.5,
    0.99
  );

  const fileSummary = input.files.length > 0
    ? `Uploaded ${input.files.length} plan file(s): ${input.files.map((file) => file.name).join(', ')}`
    : 'No plan files uploaded';

  const summary = [
    fileSummary,
    description ? `Notes: ${description}` : 'No additional project notes supplied.',
    `Detected area basis: ${geometry.areaSqFt.toFixed(1)} sq ft`,
  ].join(' ');

  return finalizeEstimate(
    'plan-takeoff',
    detectedCategory,
    confidence,
    regionalFactor,
    input.zipCode,
    summary,
    geometry,
    signals
  );
}

export function createBidEstimate(input: BidInput): EstimateResult {
  const description = input.description.trim();
  const explicitCategory = normalizeCategory(input.projectCategory);
  const detectedCategory = explicitCategory || detectCategoryFromText(description);
  const baseConfidence = explicitCategory ? 0.95 : 0.83;
  const geometry = inferGeometry(detectedCategory, description);
  const regionalFactor = regionFactorFromZip(input.zipCode) * microRegionCalibration(input.zipCode);

  const signals = buildEstimatorSignals({
    category: detectedCategory,
    text: description,
    geometry,
    explicitCategory: Boolean(explicitCategory),
    hasFiles: false,
    zipCode: input.zipCode,
  });

  const confidence = clamp(
    baseConfidence * 0.58 +
      signals.scopeCompleteness * 0.22 +
      signals.geometryConfidence * 0.1 +
      signals.categoryConfidence * 0.1,
    0.5,
    0.99
  );

  const summary = [
    `Job description: ${description}`,
    `Detected area basis: ${geometry.areaSqFt.toFixed(1)} sq ft`,
  ].join(' ');

  return finalizeEstimate(
    'bid-generator',
    detectedCategory,
    confidence,
    regionalFactor,
    input.zipCode,
    summary,
    geometry,
    signals
  );
}
