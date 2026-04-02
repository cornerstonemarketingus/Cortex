/**
 * Trade-specific estimation modules
 * Each trade has deterministic formulas for cost calculation
 */

export type TradeType = "deck" | "roofing" | "cleaning" | "carpentry" | "framing" | "siding";

export type TradeInput = {
  sqft: number;
  complexity: "low" | "medium" | "high";
  zip: string;
  [key: string]: any;
};

export type TradeEstimate = {
  baseLineMaterialCost: number;
  baseLineLaborCost: number;
  complexityAdjustment: number;
  total: number;
  breakdown: {
    materials: { [key: string]: number };
    labor: { [key: string]: number };
  };
  dataSource: string[];
};

// Base rates by ZIP region
export const REGIONAL_LABOR_RATES = [
  { region: 0, rate: 55 },
  { region: 10, rate: 55 },
  { region: 20, rate: 55 },
  { region: 30, rate: 55 },
  { region: 40, rate: 60 },
  { region: 50, rate: 60 },
  { region: 55, rate: 65 },
  { region: 60, rate: 65 },
  { region: 70, rate: 70 },
  { region: 80, rate: 75 },
  { region: 90, rate: 85 },
] as const;

export const getRegionalLaborRate = (zip: string): number => {
  const prefix = parseInt(zip.substring(0, 2));
  
  // Find closest match
  const rates = [...REGIONAL_LABOR_RATES].sort(
    (a, b) => Math.abs(a.region - prefix) - Math.abs(b.region - prefix)
  );
  
  return rates[0]?.rate || 65;
};

export const COMPLEXITY_MULTIPLIERS: Record<string, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.2,
};
