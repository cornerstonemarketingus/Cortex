/**
 * Cleaning Estimation Module
 * Deterministic formula-based cost calculation for cleaning services
 */

import { TradeInput, TradeEstimate, getRegionalLaborRate, COMPLEXITY_MULTIPLIERS } from "./index";

export interface CleaningInput extends TradeInput {
  type: "post_construction" | "deep_clean" | "pressure_wash" | "window_cleaning";
  size: number; // sqft
  condition: "light" | "moderate" | "heavy"; // Affects labor time
}

/**
 * Cleaning Cost Estimation
 * Formula:
 *   base_rate = sqft * rate_per_sqft
 *   condition_multiplier varies by cleaning type
 *   total = base_rate * condition_multiplier * complexity_multiplier
 * 
 * Cleaning is mostly labor since materials are minimal
 */
export function estimateCleaningCost(input: CleaningInput): TradeEstimate {
  const { size, type, condition, zip } = input;
  
  // Base rates per sqft (mostly labor)
  const typeRates: Record<string, number> = {
    post_construction: 0.35,  // $/sqft (very thorough)
    deep_clean: 0.20,         // $/sqft
    pressure_wash: 0.08,      // $/sqft (exterior)
    window_cleaning: 1.50,    // $/window (small rate)
  };

  // Condition multipliers (how dirty/difficult)
  const conditionMultipliers: Record<string, number> = {
    light: 0.8,
    moderate: 1.0,
    heavy: 1.4,
  };

  const laborRate = getRegionalLaborRate(zip);
  const baseRate = typeRates[type] || 0.15;
  const conditionMult = conditionMultipliers[condition] || 1.0;

  // All costs are labor-based for cleaning
  const baseLineMaterialCost = (size * baseRate) * 0.05; // Minimal materials (cleaners, etc.)
  const baseLineLaborCost = (size * baseRate) * 0.95; // 95% is labor
  
  const adjustedCost = (baseLineMaterialCost + baseLineLaborCost) * conditionMult;

  return {
    baseLineMaterialCost,
    baseLineLaborCost,
    complexityAdjustment: adjustedCost - (baseLineMaterialCost + baseLineLaborCost),
    total: adjustedCost,
    breakdown: {
      materials: {
        "Cleaning Supplies": baseLineMaterialCost,
      },
      labor: {
        "Labor (hourly)": baseLineLaborCost,
      },
    },
    dataSource: [
      `Regional Labor Rate (${zip}): $${laborRate}/hour`,
      `Service Type: ${type} (Condition: ${condition})`,
      "Cleaning Industry Standards (2024)",
    ],
  };
}
