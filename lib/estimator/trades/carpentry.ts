/**
 * Carpentry Estimation Module
 * Deterministic formula-based cost calculation for carpentry work
 */

import { TradeInput, TradeEstimate, getRegionalLaborRate, COMPLEXITY_MULTIPLIERS } from "./index";

export interface CarpentryInput extends TradeInput {
  projectType: "custom_cabinet" | "built_in_shelving" | "trim_molding" | "doors_frames" | "custom_millwork";
  linearFeet?: number; // For trim/molding
  unitCount?: number;  // For cabinets/doors
  woodType: "pine" | "oak" | "maple" | "walnut" | "hardwood";
}

/**
 * Carpentry Cost Estimation
 * Formula:
 *   base_material = material_cost_per_unit
 *   base_labor = units * labor_per_unit
 *   total = (base_material + base_labor) * complexity_multiplier
 */
export function estimateCarpentryFee(input: CarpentryInput): TradeEstimate {
  const { projectType, linearFeet = 0, unitCount = 0, woodType, complexity, zip } = input;

  // Material cost multipliers based on wood type
  const woodCostMultipliers: Record<string, number> = {
    pine: 1.0,
    oak: 1.3,
    maple: 1.5,
    walnut: 2.0,
    hardwood: 1.6,
  };

  // Base costs per unit/linear foot
  const projectCosts: Record<string, { material: number; labor: number }> = {
    custom_cabinet: { material: 200, labor: 120 },      // per cabinet
    built_in_shelving: { material: 80, labor: 90 },     // per linear foot
    trim_molding: { material: 4, labor: 8 },            // per linear foot
    doors_frames: { material: 150, labor: 60 },         // per door
    custom_millwork: { material: 150, labor: 140 },     // per unit
  };

  const laborRate = getRegionalLaborRate(zip);
  const woodMult = woodCostMultipliers[woodType] || 1.0;
  const baseCost = projectCosts[projectType] || { material: 100, labor: 100 };

  // Calculate units (favor provided unit count over linear feet)
  const units = unitCount > 0 ? unitCount : Math.ceil(linearFeet / 8); // Assume 8 ft sections

  const baseLineMaterialCost = baseCost.material * units * woodMult;
  const baseLineLaborCost = baseCost.labor * units * (laborRate / 65); // Normalize labor rate
  
  const complexityMultiplier = COMPLEXITY_MULTIPLIERS[complexity] || 1.0;
  const adjustedCost = (baseLineMaterialCost + baseLineLaborCost) * complexityMultiplier;

  return {
    baseLineMaterialCost,
    baseLineLaborCost,
    complexityAdjustment: adjustedCost - (baseLineMaterialCost + baseLineLaborCost),
    total: adjustedCost,
    breakdown: {
      materials: {
        "Wood & Materials": baseLineMaterialCost,
        "Hardware & Fasteners": baseLineMaterialCost * 0.1,
      },
      labor: {
        "Fabrication": baseLineLaborCost * 0.6,
        "Installation": baseLineLaborCost * 0.4,
      },
    },
    dataSource: [
      `Regional Labor Rate (${zip}): $${laborRate}/hour`,
      `Wood Type: ${woodType}`,
      "Carpentry Industry Standards (2024)",
    ],
  };
}
