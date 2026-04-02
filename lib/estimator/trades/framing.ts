/**
 * Framing Estimation Module
 * Deterministic formula-based cost calculation for structural framing
 */

import { TradeInput, TradeEstimate, getRegionalLaborRate, COMPLEXITY_MULTIPLIERS } from "./index";

export interface FramingInput extends TradeInput {
  squareFootage: number;
  frameType: "wood_2x4" | "wood_2x6" | "steel" | "icf";
  storyCount: number;
  customFeatures: "standard" | "cathedral" | "complex_roof";
}

/**
 * Framing Cost Estimation (Foundation + Walls + Roof Structure)
 * Formula:
 *   base_material = sqft * material_rate_per_sqft
 *   base_labor = sqft * labor_hours_per_sqft * labor_rate
 *   total = (base_material + base_labor) * story_multiplier * complexity_multiplier
 */
export function estimateFramingCost(input: FramingInput): TradeEstimate {
  const { squareFootage, frameType, storyCount, customFeatures, complexity, zip } = input;

  // Material costs per sqft (lumber, fasteners, connectors)
  const materialRates: Record<string, number> = {
    wood_2x4: 8.5,
    wood_2x6: 11.0,
    steel: 14.0,
    icf: 12.5,
  };

  // Labor hours per sqft (varies by frame type and complexity)
  const laborRates: Record<string, number> = {
    wood_2x4: 0.25,     // 25 min/sqft
    wood_2x6: 0.28,
    steel: 0.35,        // More complex to install
    icf: 0.20,          // Faster to assemble
  };

  // Story multiplier (upper floors cost more due to access difficulty)
  const storyMultiplier = 1.0 + ((storyCount - 1) * 0.15);

  // Custom feature complexity
  const featureMultipliers: Record<string, number> = {
    standard: 1.0,
    cathedral: 1.15,
    complex_roof: 1.25,
  };

  const laborRate = getRegionalLaborRate(zip);
  const baseMaterialRate = materialRates[frameType] || 10.0;
  const laborHoursPerSqft = laborRates[frameType] || 0.25;
  const featureMultiplier = featureMultipliers[customFeatures] || 1.0;

  const baseLineMaterialCost = squareFootage * baseMaterialRate;
  const baseLineLaborCost = squareFootage * laborHoursPerSqft * laborRate;
  
  const complexityMultiplier = COMPLEXITY_MULTIPLIERS[complexity] || 1.0;
  const adjustedCost = (baseLineMaterialCost + baseLineLaborCost) * storyMultiplier * featureMultiplier * complexityMultiplier;

  return {
    baseLineMaterialCost,
    baseLineLaborCost,
    complexityAdjustment: adjustedCost - (baseLineMaterialCost + baseLineLaborCost),
    total: adjustedCost,
    breakdown: {
      materials: {
        "Lumber & Framing Stock": baseLineMaterialCost * 0.8,
        "Hardware & Connectors": baseLineMaterialCost * 0.2,
      },
      labor: {
        "Foundation & Layout": baseLineLaborCost * 0.2,
        "Wall Framing": baseLineLaborCost * 0.4,
        "Roof Structure": baseLineLaborCost * 0.4,
      },
    },
    dataSource: [
      `Regional Labor Rate (${zip}): $${laborRate}/hour`,
      `Frame Type: ${frameType} (${storyCount} story)`,
      "Framing Industry Standards (2024)",
    ],
  };
}
