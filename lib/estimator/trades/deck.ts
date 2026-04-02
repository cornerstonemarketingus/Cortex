/**
 * Deck Estimation Module
 * Deterministic formula-based cost calculation for decks
 */

import { TradeInput, TradeEstimate, getRegionalLaborRate, COMPLEXITY_MULTIPLIERS } from "./index";

export interface DeckInput extends TradeInput {
  material: "pressure_treated" | "composite" | "cedar" | "ipE";
  size: number; // sqft
}

/**
 * Deck Cost Estimation
 * Formula:
 *   base_material = sqft * material_rate
 *   base_labor = sqft * (labor_rate / 80 sqft/day)
 *   total = (base_material + base_labor) * complexity_multiplier
 */
export function estimateDeckCost(input: DeckInput): TradeEstimate {
  const { size, material, complexity, zip } = input;
  
  // Material costs per sqft
  const materialRates: Record<string, number> = {
    pressure_treated: 8.5,
    composite: 12.0,
    cedar: 10.5,
    ipE: 16.0,
  };

  const laborRate = getRegionalLaborRate(zip);
  const laborHoursPerSqft = 0.15; // 15 min per sqft = 0.15 hours

  const baseLineMaterialCost = size * materialRates[material];
  const baseLineLaborCost = size * laborHoursPerSqft * laborRate;
  
  const complexityMultiplier = COMPLEXITY_MULTIPLIERS[complexity] || 1.0;
  const adjustedCost = (baseLineMaterialCost + baseLineLaborCost) * complexityMultiplier;

  return {
    baseLineMaterialCost,
    baseLineLaborCost,
    complexityAdjustment: adjustedCost - (baseLineMaterialCost + baseLineLaborCost),
    total: adjustedCost,
    breakdown: {
      materials: {
        "Decking Material": baseLineMaterialCost,
        "Hardware & Fasteners": baseLineMaterialCost * 0.1,
      },
      labor: {
        "Installation & Framing": baseLineLaborCost,
        "Finishing": baseLineLaborCost * 0.15,
      },
    },
    dataSource: [
      `Regional Labor Rate (${zip}): $${laborRate}/hour`,
      `Material Type: ${material}`,
      "Deck Industry Standards (2024)",
    ],
  };
}
