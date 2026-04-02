"use client";

import { useState } from "react";
import { calculateEstimate } from "@/lib/estimator/engine";

type ProjectType = "custom_home" | "spec_home" | "multi_unit" | "addition" | "remodel";
type FramingType = "wood_frame" | "steel_frame" | "concrete";
type FoundationType = "concrete_slab" | "crawl_space" | "basement" | "pier_post";

const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  { value: "custom_home", label: "Custom Home", description: "New construction from ground up" },
  { value: "spec_home", label: "Spec Home", description: "Builder-standard new build" },
  { value: "multi_unit", label: "Multi-Unit", description: "Duplex, triplex, or apartment" },
  { value: "addition", label: "Addition", description: "Expansion to existing home" },
  { value: "remodel", label: "Remodel", description: "Interior or exterior renovation" },
];

const FRAMING_TYPES: { value: FramingType; label: string }[] = [
  { value: "wood_frame", label: "Wood Frame" },
  { value: "steel_frame", label: "Steel Frame" },
  { value: "concrete", label: "Concrete" },
];

const FOUNDATION_TYPES: { value: FoundationType; label: string }[] = [
  { value: "concrete_slab", label: "Concrete Slab" },
  { value: "crawl_space", label: "Crawl Space" },
  { value: "basement", label: "Full Basement" },
  { value: "pier_post", label: "Pier & Post" },
];

interface EstimatorState {
  step: "input" | "results";
  projectType?: ProjectType;
  sqft?: number;
  framingType?: FramingType;
  foundationType?: FoundationType;
  zipCode?: string;
  estimate?: any;
}

export default function EstimatorTool() {
  const [state, setState] = useState<EstimatorState>({ step: "input" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (key: keyof EstimatorState, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validateAndEstimate = () => {
    const newErrors: Record<string, string> = {};

    if (!state.projectType) newErrors.projectType = "Project type required";
    if (!state.sqft || state.sqft < 500) newErrors.sqft = "Minimum 500 sqft";
    if (!state.framingType) newErrors.framingType = "Framing type required";
    if (!state.foundationType) newErrors.foundationType = "Foundation type required";
    if (!state.zipCode || state.zipCode.length !== 5) newErrors.zipCode = "Valid ZIP code required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create material and labor items based on project type and inputs
    const baseMatCostPerSqft = 35; // Base material cost per sqft
    const baseLaborHourlyRate = 65; // Hourly labor rate
    const laborHoursPerSqft = 0.8; // Hours of labor per sqft

    const materials = [
      {
        name: "Foundation & Structure",
        quantity: state.sqft!,
        unit: "sqft",
        unitCost: 12,
      },
      {
        name: "Framing & Lumber",
        quantity: state.sqft!,
        unit: "sqft",
        unitCost: 15,
      },
      {
        name: "Electrical & Plumbing",
        quantity: state.sqft!,
        unit: "sqft",
        unitCost: 8,
      },
    ];

    const labor = [
      {
        trade: "Carpenter",
        hours: state.sqft! * 0.4,
        hourlyRate: baseLaborHourlyRate,
      },
      {
        trade: "Electrician",
        hours: state.sqft! * 0.15,
        hourlyRate: 85,
      },
      {
        trade: "Plumber",
        hours: state.sqft! * 0.15,
        hourlyRate: 85,
      },
    ];

    const estimate = calculateEstimate({
      materials,
      labor,
      multipliers: {
        overheadRate: 0.15,
        taxRate: 0.08,
        profitMarginRate: 0.2,
        locationFactor: getLocationFactor(state.zipCode!),
        complexityFactor: getComplexityFactor(state.projectType!),
      },
    });

    setState((prev) => ({ ...prev, step: "results", estimate }));
  };

  const getLocationFactor = (zip: string): number => {
    // Simple regional adjustment based on zip code prefix
    const zipPrefix = parseInt(zip.substring(0, 2));
    if (zipPrefix >= 90) return 1.15; // CA high cost
    if (zipPrefix >= 75) return 1.12; // TX mid-high
    if (zipPrefix >= 55) return 0.95; // MN low-mid
    if (zipPrefix >= 1 && zipPrefix <= 30) return 1.08; // East coast
    return 1.0;
  };

  const getComplexityFactor = (projectType: ProjectType): number => {
    const factors: Record<ProjectType, number> = {
      custom_home: 1.2,
      spec_home: 1.0,
      multi_unit: 1.15,
      addition: 0.85,
      remodel: 0.9,
    };
    return factors[projectType] || 1.0;
  };

  if (state.step === "results" && state.estimate) {
    return <ResultsPanel estimate={state.estimate} onReset={() => setState({ step: "input" })} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#0a0d12] text-slate-100 py-12">
      <div className="mx-auto max-w-2xl px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Construction Cost Estimator</h1>
          <p className="mt-2 text-slate-400">Get an instant ballpark for your project in 30 seconds</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          {/* Step 1: Project Type */}
          <div className="mb-8">
            <label className="block text-sm font-semibold mb-4">1. What are you building?</label>
            <div className="grid grid-cols-1 gap-3">
              {PROJECT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleInputChange("projectType", type.value)}
                  className={`rounded-lg border-2 p-4 text-left transition ${
                    state.projectType === type.value
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-white/20 bg-white/5 hover:border-white/40"
                  }`}
                >
                  <p className="font-semibold">{type.label}</p>
                  <p className="text-xs text-slate-400">{type.description}</p>
                </button>
              ))}
            </div>
            {errors.projectType && <p className="mt-2 text-xs text-red-400">{errors.projectType}</p>}
          </div>

          {/* Step 2: Square Footage */}
          <div className="mb-8">
            <label className="block text-sm font-semibold mb-3">2. Square footage?</label>
            <div className="relative">
              <input
                type="number"
                value={state.sqft || ""}
                onChange={(e) => handleInputChange("sqft", parseInt(e.target.value) || undefined)}
                placeholder="e.g., 2500"
                className="w-full rounded-lg border border-white/20 bg-white/8 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
              />
              <span className="absolute right-4 top-3 text-sm text-slate-400">sqft</span>
            </div>
            {errors.sqft && <p className="mt-2 text-xs text-red-400">{errors.sqft}</p>}
          </div>

          {/* Step 3: Framing Type */}
          <div className="mb-8">
            <label className="block text-sm font-semibold mb-4">3. Framing type?</label>
            <div className="grid grid-cols-3 gap-3">
              {FRAMING_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleInputChange("framingType", type.value)}
                  className={`rounded-lg border-2 p-3 text-center text-sm font-semibold transition ${
                    state.framingType === type.value
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-white/20 bg-white/5 hover:border-white/40"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {errors.framingType && <p className="mt-2 text-xs text-red-400">{errors.framingType}</p>}
          </div>

          {/* Step 4: Foundation Type */}
          <div className="mb-8">
            <label className="block text-sm font-semibold mb-4">4. Foundation type?</label>
            <div className="grid grid-cols-2 gap-3">
              {FOUNDATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleInputChange("foundationType", type.value)}
                  className={`rounded-lg border-2 p-3 text-center text-sm font-semibold transition ${
                    state.foundationType === type.value
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-white/20 bg-white/5 hover:border-white/40"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {errors.foundationType && <p className="mt-2 text-xs text-red-400">{errors.foundationType}</p>}
          </div>

          {/* Step 5: ZIP Code */}
          <div className="mb-8">
            <label className="block text-sm font-semibold mb-3">5. Where? (ZIP code)</label>
            <input
              type="text"
              value={state.zipCode || ""}
              onChange={(e) => handleInputChange("zipCode", e.target.value)}
              placeholder="55123"
              maxLength={5}
              className="w-full rounded-lg border border-white/20 bg-white/8 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
            />
            {errors.zipCode && <p className="mt-2 text-xs text-red-400">{errors.zipCode}</p>}
          </div>

          {/* Submit Button */}
          <button
            onClick={validateAndEstimate}
            className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-700 transition"
          >
            Get Estimate
          </button>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          This is a ballpark estimate for planning purposes. Actual costs vary based on site conditions, market conditions, and local codes.
        </p>
      </div>
    </div>
  );
}

function ResultsPanel({ estimate, onReset }: { estimate: any; onReset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#0a0d12] text-slate-100 py-12">
      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <button
          onClick={onReset}
          className="mb-6 text-sm text-blue-400 hover:text-blue-300 transition"
        >
          ← Start New Estimate
        </button>

        {/* Estimate Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          {/* Main Estimate */}
          <div className="mb-10 border-b border-white/10 pb-10">
            <p className="text-sm text-slate-400 mb-2">ESTIMATED COST</p>
            <div className="space-y-2">
              <p className="text-5xl font-bold text-blue-400">${estimate.total.toLocaleString()}</p>
              <div className="flex gap-6 text-sm text-slate-300">
                <div>
                  <p className="text-xs text-slate-500">LOW END</p>
                  <p className="font-semibold">${(estimate.total * 0.85).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">HIGH END</p>
                  <p className="font-semibold">${(estimate.total * 1.15).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="mb-10 border-b border-white/10 pb-10">
            <h3 className="mb-4 text-lg font-semibold">Cost Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-slate-300">Materials</span>
                <span className="font-semibold text-white">${estimate.materialsTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-slate-300">Labor</span>
                <span className="font-semibold text-white">${estimate.laborTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-slate-300">Overhead, Profit, Tax</span>
                <span className="font-semibold text-white">${(estimate.total - estimate.materialsTotal - estimate.laborTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Key Cost Drivers */}
          <div className="mb-10 border-b border-white/10 pb-10">
            <h3 className="mb-4 text-lg font-semibold">What Drives This Cost?</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>✓ Square footage and project complexity</li>
              <li>✓ Foundation type (basement adds cost)</li>
              <li>✓ Framing material and labor rates</li>
              <li>✓ Regional cost adjustments</li>
              <li>✓ Permits, codes, and inspections</li>
            </ul>
          </div>

          {/* Build Phases */}
          <div className="mb-10">
            <h3 className="mb-4 text-lg font-semibold">Typical Build Timeline</h3>
            <div className="space-y-3">
              {[
                { phase: "Foundation & Framing", months: "2-3 months", pct: 25 },
                { phase: "Electrical, Plumbing, HVAC", months: "4-6 weeks", pct: 20 },
                { phase: "Drywall & Interior Finishes", months: "4-6 weeks", pct: 35 },
                { phase: "Final Inspections & Closeout", months: "2-3 weeks", pct: 20 },
              ].map((phase, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">{phase.phase}</span>
                    <span className="text-xs text-slate-400">{phase.months}</span>
                  </div>
                  <progress
                    className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-value]:bg-blue-500 [&::-moz-progress-bar]:bg-blue-500"
                    value={phase.pct}
                    max={100}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
            <h3 className="mb-3 font-semibold text-blue-300">Next Steps</h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li>✓ Share this estimate with your contractor</li>
              <li>✓ Validate with local building department</li>
              <li>✓ Adjust for any custom finishes or upgrades</li>
              <li>✓ Get formal bids from 3-5 contractors</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <button
            onClick={onReset}
            className="rounded-lg bg-white/10 px-6 py-3 font-semibold hover:bg-white/20 transition"
          >
            Create Another Estimate
          </button>
        </div>
      </div>
    </div>
  );
}
