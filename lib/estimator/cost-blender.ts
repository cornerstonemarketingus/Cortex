/**
 * Cost Blending Engine
 * Combines deterministic formula-based costs with live market data
 * using weighted averaging
 * 
 * Formula: final_cost = (formula_cost * 0.7) + (market_cost * 0.3)
 * 
 * This ensures your proprietary logic (0.7) is weighted higher than
 * market data (0.3), while still adjusting for real conditions
 */

import { MarketDataManager } from "./market-data";

export interface BlendedEstimate {
  formulaBased: number;
  marketBased: number;
  blendedCost: number;
  confidenceScore: number;
  weightings: {
    formula: number;
    market: number;
  };
  dataSources: string[];
}

export class CostBlender {
  private marketDataManager: MarketDataManager;

  // Weights: favor your logic over market noise
  private readonly FORMULA_WEIGHT = 0.7;
  private readonly MARKET_WEIGHT = 0.3;

  constructor(marketDataManager: MarketDataManager) {
    this.marketDataManager = marketDataManager;
  }

  /**
   * Blend formula-based cost with market data
   * 
   * @param formulaCost - Your deterministic calculation
   * @param marketDataPoints - Price/labor data from sources
   * @param zip - Location for market context
   * @param tradeType - What type of work (deck, roofing, etc.)
   * @returns Blended estimate with confidence score
   */
  async blendCosts(
    formulaCost: number,
    marketDataPoints: Record<string, number>,
    zip: string,
    tradeType: string
  ): Promise<BlendedEstimate> {
    // Get market data for this location/trade
    const materialMarket = await this.marketDataManager.getMarketData("material_prices", zip);
    const laborMarket = await this.marketDataManager.getMarketData("labor_rates", zip);
    const trends = await this.marketDataManager.getMarketData("market_trends", zip);

    // Calculate market-based cost estimate
    const marketCost = this.calculateMarketBasedCost(
      marketDataPoints,
      materialMarket.data,
      laborMarket.data,
      trends.data
    );

    // Blend using weighted average
    const blendedCost = 
      (formulaCost * this.FORMULA_WEIGHT) + 
      (marketCost * this.MARKET_WEIGHT);

    // Calculate confidence score based on data freshness
    const confidenceScore = this.calculateConfidence(
      materialMarket.confidence,
      laborMarket.confidence,
      trends.confidence
    );

    return {
      formulaBased: formulaCost,
      marketBased: marketCost,
      blendedCost: Math.round(blendedCost),
      confidenceScore,
      weightings: {
        formula: this.FORMULA_WEIGHT,
        market: this.MARKET_WEIGHT,
      },
      dataSources: [
        ...materialMarket.source,
        ...laborMarket.source,
        ...trends.source,
      ],
    };
  }

  /**
   * Calculate market-based cost from data points
   * Applies regional multipliers and trend adjustments
   */
  private calculateMarketBasedCost(
    dataPoints: Record<string, number>,
    materialPrices: Record<string, number>,
    laborRates: Record<string, number>,
    trends: Record<string, number>
  ): number {
    let cost = 0;

    // Sum material data points with market context
    const materialKeys = Object.keys(dataPoints).filter(k => k.includes("material") || k.includes("supply"));
    materialKeys.forEach(key => {
      cost += (dataPoints[key] || 0) * (materialPrices[key] || 1.0) * (trends.lumber_price_trend || 1.0);
    });

    // Sum labor data points with market context
    const laborKeys = Object.keys(dataPoints).filter(k => k.includes("labor") || k.includes("hours"));
    laborKeys.forEach(key => {
      const value = dataPoints[key] || 0;
      // Assume labor data points are in hours; multiply by regional hourly rate
      cost += value * (laborRates.carpenter_hourly || 65) * (trends.labor_demand || 1.0);
    });

    return cost;
  }

  /**
   * Confidence score (0-1) based on data source freshness
   * Higher score = fresher, more reliable data
   */
  private calculateConfidence(...confidenceScores: number[]): number {
    if (confidenceScores.length === 0) return 0.5;
    
    const average = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    
    // Penalize if any source is very stale
    const minScore = Math.min(...confidenceScores);
    const hasStaleData = minScore < 0.6;
    
    return hasStaleData ? average * 0.9 : average;
  }
}
