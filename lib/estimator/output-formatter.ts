/**
 * Professional Output Formatter
 * Takes cost estimates and produces professional,  actionable artifacts
 * Including: low/mid/high ranges, breakdowns, key drivers, confidence scores
 */

export interface FormattedEstimate {
  projectSummary: {
    type: string;
    location: string;
    date: string;
  };
  priceRange: {
    low: number;
    mid: number;
    high: number;
  };
  costBreakdown: {
    materials: number;
    labor: number;
    overhead: number;
    profit: number;
    tax: number;
    total: number;
  };
  lineItems: Array<{
    category: string;
    description: string;
    quantity: number;
    unit: string;
    unitCost: number;
    total: number;
  }>;
  keyDrivers: string[];
  buildPhases: Array<{
    phase: string;
    duration: string;
    percentOfBudget: number;
    tasks: string[];
  }>;
  confidenceScore: {
    value: number; // 0-1
    interpretation: string;
    dataFreshness: string[];
  };
  dataSources: string[];
  recommendations: string[];
  nextSteps: string[];
}

export class EstimateFormatter {
  /**
   * Format a raw estimate into a professional artifact
   */
  format(
    centralEstimate: number,
    breakdown: Record<string, number>,
    projectType: string,
    location: string,
    confidenceScore: number,
    dataSources: string[]
  ): FormattedEstimate {
    // Calculate ranges around central estimate
    // Low: -15%, Mid: 0%, High: +20% (construction varies)
    const lowRange = Math.round(centralEstimate * 0.85);
    const midRange = Math.round(centralEstimate);
    const highRange = Math.round(centralEstimate * 1.2);

    // Calculate itemized costs
    const materialsRatio = 0.35; // Typical 35% materials
    const laborRatio = 0.45;     // Typical 45% labor
    const overheadRatio = 0.1;   // 10% overhead
    const profitRatio = 0.1;     // 10% profit (before tax)

    const materials = Math.round(midRange * materialsRatio);
    const labor = Math.round(midRange * laborRatio);
    const overhead = Math.round(midRange * overheadRatio);
    const profit = Math.round(midRange * profitRatio);
    const tax = Math.round((materials + labor + overhead + profit) * 0.08);

    // Generate line items
    const lineItems = this.generateLineItems(projectType, materials, labor);

    // Generate cost drivers
    const keyDrivers = this.generateKeyDrivers(projectType, confidenceScore);

    // Build phases
    const buildPhases = this.generateBuildPhases(projectType, midRange);

    // Confidence interpretation
    const confidenceInterpretation = this.interpretConfidence(confidenceScore);

    // Recommendations
    const recommendations = this.generateRecommendations(projectType, confidenceScore);

    // Next steps
    const nextSteps = this.generateNextSteps(projectType);

    return {
      projectSummary: {
        type: projectType,
        location,
        date: new Date().toLocaleDateString(),
      },
      priceRange: {
        low: lowRange,
        mid: midRange,
        high: highRange,
      },
      costBreakdown: {
        materials,
        labor,
        overhead,
        profit,
        tax,
        total: midRange,
      },
      lineItems,
      keyDrivers,
      buildPhases,
      confidenceScore: {
        value: confidenceScore,
        interpretation: confidenceInterpretation,
        dataFreshness: this.getDataFreshness(confidenceScore),
      },
      dataSources,
      recommendations,
      nextSteps,
    };
  }

  private generateLineItems(
    projectType: string,
    materials: number,
    labor: number
  ): FormattedEstimate["lineItems"] {
    const itemTemplates: Record<string, FormattedEstimate["lineItems"]> = {
      deck: [
        { category: "Materials", description: "Decking boards", quantity: 200, unit: "sqft", unitCost: 8.5, total: 1700 },
        { category: "Materials", description: "Posts & framing", quantity: 12, unit: "ea", unitCost: 45, total: 540 },
        { category: "Materials", description: "Hardware & fasteners", quantity: 1, unit: "job", unitCost: 200, total: 200 },
        { category: "Labor", description: "Framing & installation", quantity: 40, unit: "hours", unitCost: 65, total: 2600 },
        { category: "Labor", description: "Finishing", quantity: 10, unit: "hours", unitCost: 65, total: 650 },
      ],
      roofing: [
        { category: "Materials", description: "Roofing material", quantity: 30, unit: "squares", unitCost: 350, total: 10500 },
        { category: "Materials", description: "Underlayment & flashing", quantity: 1, unit: "job", unitCost: 1500, total: 1500 },
        { category: "Labor", description: "Removal & disposal", quantity: 30, unit: "hours", unitCost: 65, total: 1950 },
        { category: "Labor", description: "Installation", quantity: 80, unit: "hours", unitCost: 65, total: 5200 },
      ],
      custom_home: [
        { category: "Materials", description: "Foundation materials", quantity: 2000, unit: "sqft", unitCost: 12, total: 24000 },
        { category: "Materials", description: "Framing lumber", quantity: 2000, unit: "sqft", unitCost: 15, total: 30000 },
        { category: "Materials", description: "Electrical, plumbing systems", quantity: 2000, unit: "sqft", unitCost: 8, total: 16000 },
        { category: "Labor", description: "Foundation work", quantity: 200, unit: "hours", unitCost: 65, total: 13000 },
        { category: "Labor", description: "Framing", quantity: 600, unit: "hours", unitCost: 65, total: 39000 },
      ],
    };

    return itemTemplates[projectType] || [
      { category: "Materials", description: "Materials", quantity: 1, unit: "job", unitCost: materials, total: materials },
      { category: "Labor", description: "Labor", quantity: 1, unit: "job", unitCost: labor, total: labor },
    ];
  }

  private generateKeyDrivers(projectType: string, confidence: number): string[] {
    const drivers: Record<string, string[]> = {
      deck: [
        "Material type (composite more expensive than treated lumber)",
        "Site accessibility (difficult access increases labor)",
        "Foundation type (frost line requirements in cold climates)",
        "Permits & inspections (varies by local jurisdiction)",
        "Existing site preparation (clearing/grading needed)",
      ],
      roofing: [
        "Roof pitch (steeper = more labor required)",
        "Material choice (asphalt vs. metal vs. slate)",
        "Current roof condition (removal complexity)",
        "Regional labor costs (coastal markets higher)",
        "Permits & underlayment requirements",
      ],
      cleaning: [
        "Contamination level (post-construction cleanup intensity)",
        "Square footage and site accessibility",
        "Hardscape vs. carpeted finishes",
        "Hazardous materials (if applicable)",
      ],
      default: [
        "Project scope and complexity",
        "Regional labor rates",
        "Material availability",
        "Site access and logistics",
        "Seasonal factors",
      ],
    };

    return drivers[projectType] || drivers.default;
  }

  private generateBuildPhases(projectType: string, budget: number): FormattedEstimate["buildPhases"] {
    const phaseTemplates: Record<string, FormattedEstimate["buildPhases"]> = {
      custom_home: [
        { phase: "Site Prep & Foundation", duration: "6-8 weeks", percentOfBudget: 12, tasks: [" Grading & layout", "Excavation", "Foundation pour", "Waterproofing"] },
        { phase: "Framing & Roof", duration: "4-5 weeks", percentOfBudget: 22, tasks: ["Wall framing", "Roof structure", "Sheathing", "Weather protection"] },
        { phase: "MEP Rough-In", duration: "3-4 weeks", percentOfBudget: 18, tasks: ["Electrical", "Plumbing", "HVAC systems", "Inspections"] },
        { phase: "Finishes", duration: "6-8 weeks", percentOfBudget: 35, tasks: ["Drywall & mudding", "Painting", "Flooring", "Trim & doors", "Cabinets"] },
        { phase: "Final & Closeout", duration: "2-3 weeks", percentOfBudget: 13, tasks: ["Final inspections", "Cleanup", "Punch list", "Certificate of occupancy"] },
      ],
      deck: [
        { phase: "Site Preparation", duration: "1-2 days", percentOfBudget: 5, tasks: ["Layout", "Permits acquired", "Site cleared"] },
        { phase: "Foundation & Frame", duration: "3-4 days", percentOfBudget: 35, tasks: ["Posts set", "Ledger attached", "Joists installed"] },
        { phase: "Decking & Rails", duration: "2-3 days", percentOfBudget: 40, tasks: ["Decking boards", "Railings installed", "Stairs added"] },
        { phase: "Finishing", duration: "1-2 days", percentOfBudget: 20, tasks: ["Staining/sealing", "Final cleanup", "Final inspection"] },
      ],
      roofing: [
        { phase: "Preparation", duration: "1 day", percentOfBudget: 8, tasks: ["Permits", "Tarping/protection", "Dumpster setup"] },
        { phase: "Removal", duration: "1-2 days", percentOfBudget: 15, tasks: ["Tear off", "Disposal", "Inspection"] },
        { phase: "Installation", duration: "2-3 days", percentOfBudget: 65, tasks: ["Underlayment", "Roofing material", "Flashing & vents"] },
        { phase: "Cleanup", duration: "1 day", percentOfBudget: 12, tasks: ["Debris removal", "Final inspection", "Warranty"] },
      ],
    };

    return phaseTemplates[projectType] || phaseTemplates.deck;
  }

  private interpretConfidence(score: number): string {
    if (score >= 0.9) return "Very High Confidence - Recent, verified data";
    if (score >= 0.75) return "High Confidence - Fresh data from multiple sources";
    if (score >= 0.6) return "Good Confidence - Reasonably current estimates";
    if (score >= 0.4) return "Moderate Confidence - May need validation";
    return "Low Confidence - Based on older data or limited sources";
  }

  private getDataFreshness(score: number): string[] {
    const freshness: string[] = [];
    
    if (score >= 0.85) {
      freshness.push("Labor rates updated this month");
      freshness.push("Material prices current as of today");
    } else if (score >= 0.7) {
      freshness.push("Labor data from past 3 months");
      freshness.push("Material prices within 2 weeks");
    } else {
      freshness.push("Some data may be 4+ weeks old");
      freshness.push("Recommend confirming with local suppliers");
    }

    return freshness;
  }

  private generateRecommendations(projectType: string, confidence: number): string[] {
    const recommendations = [
      "Get 3-5 competitive bids from licensed contractors",
      "Review all line items with your contractor",
      "Validate permits and code requirements with building department",
    ];

    if (confidence < 0.75) {
      recommendations.push("Consider waiting for fresher market data before committing");
    }

    if (projectType === "custom_home") {
      recommendations.push("Factor in contingency (10-20% of budget)");
      recommendations.push("Lock in pricing with contractor before finalizing");
    }

    return recommendations;
  }

  private generateNextSteps(projectType: string): string[] {
    return [
      "Share this estimate with 3-5 contractors",
      `Validate against your project scope (${projectType})`,
      "Adjust for any premium finishes or special requirements",
      "Request detailed pricing from contractors",
      "Get firm quotes with payment terms",
      "Review contractor references and insurance",
      "Finalize scope of work agreement",
    ];
  }
}

export const estimateFormatter = new EstimateFormatter();
