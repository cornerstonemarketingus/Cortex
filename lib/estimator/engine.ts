/* Brief approach:
   - Pure, deterministic TypeScript functions operate on structured inputs.
   - Separate material and labor calculations, then apply multipliers.
   - Return a detailed, testable breakdown (no side-effects).
*/

export interface MaterialItem {
  name: string;
  quantity: number; // units
  unit: string; // e.g., "each", "sqft"
  unitCost: number; // cost per unit
}

export interface LaborItem {
  trade: string; // e.g., "carpenter"
  hours: number;
  hourlyRate: number; // cost per hour
}

export interface Multipliers {
  overheadRate?: number; // decimal (e.g., 0.15 for 15%)
  taxRate?: number; // decimal
  profitMarginRate?: number; // decimal
  locationFactor?: number; // multiplier for local cost variance (default 1)
  complexityFactor?: number; // multiplier for scope complexity (default 1)
}

export interface EstimateInput {
  materials: MaterialItem[];
  labor: LaborItem[];
  multipliers?: Multipliers;
}

export interface ItemizedCost {
  key: string;
  cost: number;
}

export interface EstimateBreakdown {
  materialsTotal: number;
  laborTotal: number;
  subtotal: number; // materials + labor
  overheadAmount: number;
  taxAmount: number;
  profitAmount: number;
  total: number;
  details: {
    materials: ItemizedCost[];
    labor: ItemizedCost[];
  };
}

function nonNegative(value: number, name = 'value'): number {
  const v = Number(value || 0);
  if (!isFinite(v) || v < 0) return 0;
  return v;
}

export function calculateMaterialCosts(materials: MaterialItem[]): { total: number; items: ItemizedCost[] } {
  const items: ItemizedCost[] = materials.map((m) => {
    const qty = nonNegative(m.quantity, 'quantity');
    const unitCost = nonNegative(m.unitCost, 'unitCost');
    const cost = qty * unitCost;
    return { key: m.name || `${m.unit}` , cost };
  });
  const total = items.reduce((s, it) => s + it.cost, 0);
  return { total, items };
}

export function calculateLaborCosts(labor: LaborItem[]): { total: number; items: ItemizedCost[] } {
  const items: ItemizedCost[] = labor.map((l) => {
    const hours = nonNegative(l.hours, 'hours');
    const rate = nonNegative(l.hourlyRate, 'hourlyRate');
    const cost = hours * rate;
    return { key: l.trade || 'labor', cost };
  });
  const total = items.reduce((s, it) => s + it.cost, 0);
  return { total, items };
}

export function applyMultipliers(subtotal: number, multipliers?: Multipliers) {
  const m = multipliers || {};
  const overheadRate = nonNegative(m.overheadRate || 0);
  const taxRate = nonNegative(m.taxRate || 0);
  const profitMarginRate = nonNegative(m.profitMarginRate || 0);
  const locationFactor = nonNegative(m.locationFactor || 1);
  const complexityFactor = nonNegative(m.complexityFactor || 1);

  const adjustedSubtotal = subtotal * locationFactor * complexityFactor;
  const overheadAmount = adjustedSubtotal * overheadRate;
  const taxAmount = adjustedSubtotal * taxRate;
  const profitAmount = adjustedSubtotal * profitMarginRate;
  const total = adjustedSubtotal + overheadAmount + taxAmount + profitAmount;

  return {
    adjustedSubtotal,
    overheadAmount,
    taxAmount,
    profitAmount,
    total,
  };
}

export function calculateEstimate(input: EstimateBreakdown | EstimateInput): EstimateBreakdown {
  // Accept either EstimateInput or partial EstimateBreakdown (to ease testing),
  // but prefer structured input when available.
  const isInput = (x: any): x is EstimateInput => 'materials' in x && 'labor' in x;
  if (!isInput(input)) {
    // If EstimateBreakdown was passed, return it back (idempotent)
    return input as EstimateBreakdown;
  }

  const materialsResult = calculateMaterialCosts(input.materials || []);
  const laborResult = calculateLaborCosts(input.labor || []);

  const subtotal = materialsResult.total + laborResult.total;
  const multipliers = (input as EstimateInput).multipliers;

  const applied = applyMultipliers(subtotal, multipliers);

  return {
    materialsTotal: materialsResult.total,
    laborTotal: laborResult.total,
    subtotal: subtotal,
    overheadAmount: applied.overheadAmount,
    taxAmount: applied.taxAmount,
    profitAmount: applied.profitAmount,
    total: applied.total,
    details: {
      materials: materialsResult.items,
      labor: laborResult.items,
    },
  };
}

export default {
  calculateMaterialCosts,
  calculateLaborCosts,
  applyMultipliers,
  calculateEstimate,
};
