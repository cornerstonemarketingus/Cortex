/**
 * Roofing Estimation Module
 * Deterministic formula-based cost calculation for roofing projects
 */

import { TradeInput, TradeEstimate, getRegionalLaborRate, COMPLEXITY_MULTIPLIERS } from "./index";

export interface RoofingInput extends TradeInput {
  material: "asphalt_shingles" | "metal" | "slate" | "tile";
  size: number; // sqft
  roofPitch: "low" | "standard" | "steep"; // Affects labor cost
}

/**
 * Roofing Cost Estimation
 * Formula:
 *   base_material = sqft * material_rate
 *   base_labor = sqft * labor_rate_per_sqft
 *   pitch_adjustment applies to labor
 *   total = (base_material + base_labor) * complexity_multiplier
 */
export function estimateRoofingCost(input: RoofingInput): TradeEstimate {
  const { size, material, complexity, zip, roofPitch } = input;
  
  // Material costs per sqft (includes underlayment, flashing)
  const materialRates: Record<string, number> = {
    asphalt_shingles: 6.5,
    metal: 9.0,
    slate: 20.0,
    tile: 18.0,
  };

  // Pitch multipliers affect installation difficulty
  const pitchMultipliers: Record<string, number> = {
    low: 0.85,
    standard: 1.0,
    steep: 1.25,
  };

  const laborRate = getRegionalLaborRate(zip);
  const baseLaborPerSqft = 0.018; // About 1 square (100 sqft) per 5-6 hours

  const baseLineMaterialCost = size * materialRates[material];
  const baseLaborCost = size * baseLaborPerSqft * laborRate * (pitchMultipliers[roofPitch] || 1.0);
  
  const complexityMultiplier = COMPLEXITY_MULTIPLIERS[complexity] || 1.0;
  const adjustedCost = (baseLineMaterialCost + baseLaborCost) * complexityMultiplier;

  return {
    baseLineMaterialCost,
    baseLineLaborCost: baseLaborCost,
    complexityAdjustment: adjustedCost - (baseLineMaterialCost + baseLaborCost),
    total: adjustedCost,
    breakdown: {
      materials: {
        "Roofing Material": baseLineMaterialCost,
        "Underlayment & Flashing": baseLineMaterialCost * 0.15,
      },
      labor: {
        "Removal & Disposal": baseLaborCost * 0.2,
        "Installation": baseLaborCost * 0.8,
      },
    },
    dataSource: [
      `Regional Labor Rate (${zip}): $${laborRate}/hour`,
      `Material Type: ${material} (Pitch: ${roofPitch})`,
      "Roofing Industry Standards (2024)",
    ],
  };
}
