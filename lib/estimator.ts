export type EstimateItem = {
  name: string;
  unit: string;
  quantity: number;
  unitCost: number; // material unit cost
  laborRate?: number; // per-unit labor rate or per-hour
  laborHours?: number; // computed hours
  materialCost: number;
  laborCost: number;
  total: number;
};

export type EstimateResult = {
  items: EstimateItem[];
  totals: {
    materials: number;
    labor: number;
    overhead: number;
    profit: number;
    grandTotal: number;
  };
  confidence: number; // 0-100
  notes?: string[];
};

// Lightweight seeded cost DB. Values are illustrative U.S. averages.
const costDB = {
  framing: {
    materialPerSqft: 4.5,
    laborPerSqft: 6.5,
  },
  drywall: {
    materialPerSqft: 1.8,
    laborPerSqft: 3.8,
  },
  windows: {
    materialPerUnit: 600,
    laborPerUnit: 450,
  },
  roofing: {
    materialPerSqft: 5.5,
    laborPerSqft: 6.2,
  },
};

function regionMultiplier(zip = '') {
  if (!zip) return 1.0;
  if (zip.startsWith('90') || zip.startsWith('94')) return 1.15; // west coast premium
  if (zip.startsWith('55')) return 1.02; // example midwest
  return 1.05; // default slight premium
}

export function generateEstimateFromStructured(fields: {
  scope: string[];
  framingSqFt?: number;
  windowsCount?: number;
  laborTier?: 'budget' | 'standard' | 'premium';
  materialGrade?: 'low' | 'mid' | 'high';
  zip?: string;
}) : EstimateResult {
  const loc = regionMultiplier(fields.zip || '');
  const items: EstimateItem[] = [];

  const qualityMultiplier = fields.materialGrade === 'high' ? 1.18 : fields.materialGrade === 'low' ? 0.92 : 1.0;
  const laborTierMultiplier = fields.laborTier === 'premium' ? 1.2 : fields.laborTier === 'budget' ? 0.9 : 1.0;

  if (fields.scope.includes('framing')) {
    const sqft = fields.framingSqFt || 1000;
    const materialUnit = costDB.framing.materialPerSqft * qualityMultiplier * loc;
    const laborUnit = costDB.framing.laborPerSqft * laborTierMultiplier * loc;
    const materialCost = Math.round(materialUnit * sqft);
    const laborCost = Math.round(laborUnit * sqft);
    items.push({
      name: 'Framing',
      unit: 'sqft',
      quantity: sqft,
      unitCost: Math.round(materialUnit + laborUnit),
      laborRate: laborUnit,
      laborHours: undefined,
      materialCost,
      laborCost,
      total: Math.round(materialCost + laborCost),
    });
  }

  if (fields.scope.includes('drywall')) {
    const sqft = fields.framingSqFt || 1000;
    const materialUnit = costDB.drywall.materialPerSqft * qualityMultiplier * loc;
    const laborUnit = costDB.drywall.laborPerSqft * laborTierMultiplier * loc;
    const materialCost = Math.round(materialUnit * sqft);
    const laborCost = Math.round(laborUnit * sqft);
    items.push({
      name: 'Drywall',
      unit: 'sqft',
      quantity: sqft,
      unitCost: Math.round(materialUnit + laborUnit),
      laborRate: laborUnit,
      laborHours: undefined,
      materialCost,
      laborCost,
      total: Math.round(materialCost + laborCost),
    });
  }

  if (fields.scope.includes('windows')) {
    const count = fields.windowsCount || 4;
    const materialUnit = costDB.windows.materialPerUnit * qualityMultiplier * loc;
    const laborUnit = costDB.windows.laborPerUnit * laborTierMultiplier * loc;
    const materialCost = Math.round(materialUnit * count);
    const laborCost = Math.round(laborUnit * count);
    items.push({
      name: `Windows (${count})`,
      unit: 'each',
      quantity: count,
      unitCost: Math.round(materialUnit + laborUnit),
      laborRate: laborUnit,
      laborHours: undefined,
      materialCost,
      laborCost,
      total: Math.round(materialCost + laborCost),
    });
  }

  // Base overhead & profit assumptions
  const materialsTotal = items.reduce((s, it) => s + it.materialCost, 0);
  const laborTotal = items.reduce((s, it) => s + it.laborCost, 0);
  const overhead = Math.round((materialsTotal + laborTotal) * 0.08);
  const profit = Math.round((materialsTotal + laborTotal) * 0.12);
  const grandTotal = materialsTotal + laborTotal + overhead + profit;

  // crude confidence metric (more scope details -> higher confidence)
  let confidence = 60;
  const details = Number(Boolean(fields.framingSqFt)) + Number(Boolean(fields.windowsCount)) + Number(Boolean(fields.materialGrade)) + Number(Boolean(fields.laborTier)) + (fields.scope.length > 0 ? 1 : 0);
  confidence = Math.min(95, confidence + details * 8);

  const notes: string[] = [];
  if (!fields.framingSqFt) notes.push('Square footage not provided; using fallback estimate.');
  if (!fields.windowsCount && fields.scope.includes('windows')) notes.push('Window count not provided; using default count.');

  return {
    items,
    totals: {
      materials: materialsTotal,
      labor: laborTotal,
      overhead,
      profit,
      grandTotal,
    },
    confidence,
    notes,
  };
}
