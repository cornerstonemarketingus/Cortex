/**
 * Estimate Templates
 * Pre-built material + labor configs for common construction trades.
 * Used by the copilot to auto-fill estimates and by the UI template picker.
 */

import type { EstimateInput, MaterialItem, LaborItem } from './engine';

export type TemplateId =
  | 'residential-framing'
  | 'commercial-framing'
  | 'roofing-shingle'
  | 'roofing-metal'
  | 'windows-standard'
  | 'windows-premium'
  | 'doors-interior'
  | 'doors-exterior'
  | 'drywall-finish'
  | 'flooring-hardwood'
  | 'flooring-tile'
  | 'concrete-foundation'
  | 'painting-interior'
  | 'painting-exterior'
  | 'electrical-rough'
  | 'plumbing-rough';

export interface EstimateTemplate {
  id: TemplateId;
  name: string;
  description: string;
  category: 'framing' | 'roofing' | 'windows' | 'doors' | 'finishing' | 'utilities';
  /** Per-sqft scale factors — multiply by project sqft to get quantities */
  getMaterials: (sqft: number) => MaterialItem[];
  getLabor: (sqft: number) => LaborItem[];
  defaultMultipliers: {
    overheadRate: number;
    taxRate: number;
    profitMarginRate: number;
  };
}

function perSqft(sqft: number, factor: number, min = 0): number {
  return Math.max(min, Math.round(sqft * factor));
}

export const ESTIMATE_TEMPLATES: Record<TemplateId, EstimateTemplate> = {

  'residential-framing': {
    id: 'residential-framing',
    name: 'Residential Framing',
    description: 'Wood-frame residential structure — walls, floors, rafters.',
    category: 'framing',
    getMaterials: (sqft) => [
      { name: '2x6 Lumber (LF)', quantity: perSqft(sqft, 4), unit: 'LF', unitCost: 1.80 },
      { name: '2x4 Lumber (LF)', quantity: perSqft(sqft, 3), unit: 'LF', unitCost: 1.20 },
      { name: 'OSB Sheathing (sqft)', quantity: perSqft(sqft, 1.1), unit: 'sqft', unitCost: 0.85 },
      { name: 'LVL Beams', quantity: Math.max(2, Math.floor(sqft / 500)), unit: 'each', unitCost: 280 },
      { name: 'Joist Hangers + Hardware', quantity: perSqft(sqft, 0.08), unit: 'each', unitCost: 4.50 },
      { name: 'Nails / Fasteners (lb)', quantity: perSqft(sqft, 0.05), unit: 'lb', unitCost: 3.20 },
    ],
    getLabor: (sqft) => [
      { trade: 'Lead Framer', hours: perSqft(sqft, 0.04, 8), hourlyRate: 75 },
      { trade: 'Framing Carpenter', hours: perSqft(sqft, 0.08, 16), hourlyRate: 58 },
      { trade: 'Framing Laborer', hours: perSqft(sqft, 0.06, 8), hourlyRate: 38 },
    ],
    defaultMultipliers: { overheadRate: 0.12, taxRate: 0.07, profitMarginRate: 0.18 },
  },

  'commercial-framing': {
    id: 'commercial-framing',
    name: 'Commercial Framing',
    description: 'Light-gauge steel or heavy timber commercial framing.',
    category: 'framing',
    getMaterials: (sqft) => [
      { name: 'Steel Studs 3-5/8" (LF)', quantity: perSqft(sqft, 3.5), unit: 'LF', unitCost: 2.40 },
      { name: 'Track Runner (LF)', quantity: perSqft(sqft, 1.2), unit: 'LF', unitCost: 1.80 },
      { name: 'Header Material', quantity: Math.max(4, Math.floor(sqft / 300)), unit: 'each', unitCost: 145 },
      { name: 'Self-drilling Screws (box)', quantity: Math.ceil(sqft / 200), unit: 'box', unitCost: 22 },
      { name: 'Fire blocking (LF)', quantity: perSqft(sqft, 0.5), unit: 'LF', unitCost: 2.10 },
    ],
    getLabor: (sqft) => [
      { trade: 'Commercial Framer', hours: perSqft(sqft, 0.05, 16), hourlyRate: 82 },
      { trade: 'Apprentice Framer', hours: perSqft(sqft, 0.07, 16), hourlyRate: 52 },
    ],
    defaultMultipliers: { overheadRate: 0.15, taxRate: 0.07, profitMarginRate: 0.20 },
  },

  'roofing-shingle': {
    id: 'roofing-shingle',
    name: 'Asphalt Shingle Roofing',
    description: '30-year architectural shingles with underlayment and ice shield.',
    category: 'roofing',
    getMaterials: (sqft) => [
      { name: 'Architectural Shingles (sqft)', quantity: perSqft(sqft, 1.15), unit: 'sqft', unitCost: 1.40 },
      { name: 'Felt Underlayment (sqft)', quantity: perSqft(sqft, 1.1), unit: 'sqft', unitCost: 0.22 },
      { name: 'Ice & Water Shield (sqft)', quantity: perSqft(sqft, 0.15), unit: 'sqft', unitCost: 0.85 },
      { name: 'Roof Deck OSB (sqft)', quantity: sqft, unit: 'sqft', unitCost: 0.78 },
      { name: 'Ridge Cap Shingles', quantity: Math.ceil(sqft / 100), unit: 'bundle', unitCost: 35 },
      { name: 'Drip Edge (LF)', quantity: perSqft(sqft, 0.08), unit: 'LF', unitCost: 2.20 },
      { name: 'Roofing Nails (lb)', quantity: Math.ceil(sqft / 100), unit: 'lb', unitCost: 4.50 },
    ],
    getLabor: (sqft) => [
      { trade: 'Roofer', hours: perSqft(sqft, 0.03, 8), hourlyRate: 65 },
      { trade: 'Roofing Laborer', hours: perSqft(sqft, 0.02, 4), hourlyRate: 40 },
    ],
    defaultMultipliers: { overheadRate: 0.10, taxRate: 0.07, profitMarginRate: 0.22 },
  },

  'roofing-metal': {
    id: 'roofing-metal',
    name: 'Metal Roofing',
    description: 'Standing seam or corrugated metal roof system.',
    category: 'roofing',
    getMaterials: (sqft) => [
      { name: 'Metal Panels (sqft)', quantity: perSqft(sqft, 1.1), unit: 'sqft', unitCost: 4.50 },
      { name: 'Underlayment (sqft)', quantity: perSqft(sqft, 1.05), unit: 'sqft', unitCost: 0.30 },
      { name: 'Trim & Flashing (LF)', quantity: perSqft(sqft, 0.1), unit: 'LF', unitCost: 8.00 },
      { name: 'Screws (box)', quantity: Math.ceil(sqft / 150), unit: 'box', unitCost: 38 },
    ],
    getLabor: (sqft) => [
      { trade: 'Metal Roofer', hours: perSqft(sqft, 0.05, 8), hourlyRate: 85 },
      { trade: 'Roofing Laborer', hours: perSqft(sqft, 0.03, 4), hourlyRate: 42 },
    ],
    defaultMultipliers: { overheadRate: 0.12, taxRate: 0.07, profitMarginRate: 0.25 },
  },

  'windows-standard': {
    id: 'windows-standard',
    name: 'Window Installation (Standard)',
    description: 'Standard vinyl double-pane windows with trim and flashing.',
    category: 'windows',
    getMaterials: (sqft) => [
      {
        name: 'Windows (each)',
        quantity: Math.max(1, Math.round(sqft / 150)),
        unit: 'each',
        unitCost: 320,
      },
      {
        name: 'Exterior Trim (LF)',
        quantity: Math.max(8, Math.round(sqft / 150) * 12),
        unit: 'LF',
        unitCost: 3.50,
      },
      { name: 'Flashing Tape (roll)', quantity: Math.ceil(sqft / 600), unit: 'roll', unitCost: 28 },
      { name: 'Foam Sealant (can)', quantity: Math.ceil(sqft / 300), unit: 'can', unitCost: 12 },
    ],
    getLabor: (sqft) => [
      {
        trade: 'Window Installer',
        hours: Math.max(2, Math.round(sqft / 150) * 2.5),
        hourlyRate: 68,
      },
    ],
    defaultMultipliers: { overheadRate: 0.10, taxRate: 0.07, profitMarginRate: 0.20 },
  },

  'windows-premium': {
    id: 'windows-premium',
    name: 'Window Installation (Premium)',
    description: 'Fiberglass or aluminum triple-pane premium windows.',
    category: 'windows',
    getMaterials: (sqft) => [
      {
        name: 'Premium Windows (each)',
        quantity: Math.max(1, Math.round(sqft / 150)),
        unit: 'each',
        unitCost: 950,
      },
      {
        name: 'Custom Trim Kit',
        quantity: Math.max(1, Math.round(sqft / 150)),
        unit: 'each',
        unitCost: 85,
      },
      { name: 'Weatherstripping', quantity: Math.ceil(sqft / 400), unit: 'roll', unitCost: 22 },
    ],
    getLabor: (sqft) => [
      {
        trade: 'Premium Window Installer',
        hours: Math.max(3, Math.round(sqft / 150) * 3.5),
        hourlyRate: 88,
      },
    ],
    defaultMultipliers: { overheadRate: 0.12, taxRate: 0.07, profitMarginRate: 0.22 },
  },

  'doors-interior': {
    id: 'doors-interior',
    name: 'Interior Door Installation',
    description: 'Hollow/solid-core interior doors with hardware.',
    category: 'doors',
    getMaterials: (sqft) => [
      { name: 'Interior Doors (each)', quantity: Math.max(1, Math.round(sqft / 200)), unit: 'each', unitCost: 180 },
      { name: 'Pre-hung Frame Kit', quantity: Math.max(1, Math.round(sqft / 200)), unit: 'each', unitCost: 65 },
      { name: 'Door Hardware Set', quantity: Math.max(1, Math.round(sqft / 200)), unit: 'each', unitCost: 55 },
      { name: 'Casing Trim (LF)', quantity: Math.max(8, Math.round(sqft / 200) * 16), unit: 'LF', unitCost: 2.80 },
    ],
    getLabor: (sqft) => [
      { trade: 'Finish Carpenter', hours: Math.max(1.5, Math.round(sqft / 200) * 1.5), hourlyRate: 72 },
    ],
    defaultMultipliers: { overheadRate: 0.10, taxRate: 0.07, profitMarginRate: 0.18 },
  },

  'doors-exterior': {
    id: 'doors-exterior',
    name: 'Exterior Door Installation',
    description: 'Steel or fiberglass exterior entry doors with weatherproofing.',
    category: 'doors',
    getMaterials: (sqft) => [
      { name: 'Exterior Door Unit', quantity: Math.max(1, Math.round(sqft / 1000) + 1), unit: 'each', unitCost: 650 },
      { name: 'Deadbolt + Handle Set', quantity: Math.max(1, Math.round(sqft / 1000) + 1), unit: 'each', unitCost: 135 },
      { name: 'Door Threshold', quantity: Math.max(1, Math.round(sqft / 1000) + 1), unit: 'each', unitCost: 45 },
      { name: 'Weatherstripping Kit', quantity: Math.max(1, Math.round(sqft / 1000) + 1), unit: 'each', unitCost: 28 },
    ],
    getLabor: (sqft) => [
      { trade: 'Exterior Installer', hours: Math.max(3, (Math.round(sqft / 1000) + 1) * 3), hourlyRate: 78 },
    ],
    defaultMultipliers: { overheadRate: 0.10, taxRate: 0.07, profitMarginRate: 0.20 },
  },

  'drywall-finish': {
    id: 'drywall-finish',
    name: 'Drywall & Finishing',
    description: 'Hang, tape, mud, and finish drywall to paint-ready level 4.',
    category: 'finishing',
    getMaterials: (sqft) => [
      { name: '1/2" Drywall Sheet (sqft)', quantity: perSqft(sqft, 1.1), unit: 'sqft', unitCost: 0.65 },
      { name: 'Joint Compound (bucket)', quantity: Math.ceil(sqft / 400), unit: 'bucket', unitCost: 18 },
      { name: 'Mesh Tape (roll)', quantity: Math.ceil(sqft / 500), unit: 'roll', unitCost: 9 },
      { name: 'Corner Bead (LF)', quantity: perSqft(sqft, 0.1), unit: 'LF', unitCost: 1.20 },
      { name: 'Drywall Screws (lb)', quantity: Math.ceil(sqft / 200), unit: 'lb', unitCost: 4 },
    ],
    getLabor: (sqft) => [
      { trade: 'Drywall Hanger', hours: perSqft(sqft, 0.02, 4), hourlyRate: 55 },
      { trade: 'Taper / Finisher', hours: perSqft(sqft, 0.03, 6), hourlyRate: 62 },
    ],
    defaultMultipliers: { overheadRate: 0.10, taxRate: 0.07, profitMarginRate: 0.16 },
  },

  'flooring-hardwood': {
    id: 'flooring-hardwood',
    name: 'Hardwood Flooring',
    description: 'Solid or engineered hardwood install with underlayment.',
    category: 'finishing',
    getMaterials: (sqft) => [
      { name: 'Hardwood Flooring (sqft)', quantity: perSqft(sqft, 1.1), unit: 'sqft', unitCost: 6.50 },
      { name: 'Underlayment (sqft)', quantity: perSqft(sqft, 1.05), unit: 'sqft', unitCost: 0.45 },
      { name: 'Flooring Nails / Staples', quantity: Math.ceil(sqft / 50), unit: 'box', unitCost: 22 },
      { name: 'Floor Stain / Finish', quantity: Math.ceil(sqft / 250), unit: 'gal', unitCost: 48 },
    ],
    getLabor: (sqft) => [
      { trade: 'Flooring Installer', hours: perSqft(sqft, 0.04, 4), hourlyRate: 65 },
    ],
    defaultMultipliers: { overheadRate: 0.10, taxRate: 0.07, profitMarginRate: 0.22 },
  },

  'flooring-tile': {
    id: 'flooring-tile',
    name: 'Tile Flooring',
    description: 'Porcelain or ceramic tile install with grout and backer.',
    category: 'finishing',
    getMaterials: (sqft) => [
      { name: 'Tile (sqft)', quantity: perSqft(sqft, 1.12), unit: 'sqft', unitCost: 3.80 },
      { name: 'Cement Board (sqft)', quantity: sqft, unit: 'sqft', unitCost: 0.88 },
      { name: 'Thinset Mortar (bag)', quantity: Math.ceil(sqft / 40), unit: 'bag', unitCost: 24 },
      { name: 'Grout (bag)', quantity: Math.ceil(sqft / 80), unit: 'bag', unitCost: 18 },
      { name: 'Tile Spacers (bag)', quantity: Math.ceil(sqft / 100), unit: 'bag', unitCost: 6 },
    ],
    getLabor: (sqft) => [
      { trade: 'Tile Setter', hours: perSqft(sqft, 0.06, 4), hourlyRate: 68 },
    ],
    defaultMultipliers: { overheadRate: 0.10, taxRate: 0.07, profitMarginRate: 0.20 },
  },

  'concrete-foundation': {
    id: 'concrete-foundation',
    name: 'Concrete Foundation',
    description: 'Poured concrete slab or footings with rebar.',
    category: 'utilities',
    getMaterials: (sqft) => [
      { name: 'Concrete (cubic yard)', quantity: Math.ceil((sqft * 0.33) / 27), unit: 'CY', unitCost: 165 },
      { name: 'Rebar #4 (LF)', quantity: perSqft(sqft, 1.5), unit: 'LF', unitCost: 0.85 },
      { name: 'Vapor Barrier (sqft)', quantity: perSqft(sqft, 1.1), unit: 'sqft', unitCost: 0.18 },
      { name: 'Foam Insulation (sqft)', quantity: sqft, unit: 'sqft', unitCost: 0.65 },
    ],
    getLabor: (sqft) => [
      { trade: 'Concrete Finisher', hours: perSqft(sqft, 0.03, 8), hourlyRate: 70 },
      { trade: 'Laborer', hours: perSqft(sqft, 0.05, 8), hourlyRate: 40 },
    ],
    defaultMultipliers: { overheadRate: 0.12, taxRate: 0.075, profitMarginRate: 0.20 },
  },

  'painting-interior': {
    id: 'painting-interior',
    name: 'Interior Painting',
    description: 'Prime + 2 coats interior walls and ceilings.',
    category: 'finishing',
    getMaterials: (sqft) => [
      { name: 'Interior Paint (gal)', quantity: Math.ceil(sqft / 300), unit: 'gal', unitCost: 38 },
      { name: 'Primer (gal)', quantity: Math.ceil(sqft / 400), unit: 'gal', unitCost: 28 },
      { name: 'Masking Tape (roll)', quantity: Math.ceil(sqft / 500), unit: 'roll', unitCost: 8 },
      { name: 'Drop Cloths', quantity: Math.ceil(sqft / 800), unit: 'each', unitCost: 15 },
    ],
    getLabor: (sqft) => [
      { trade: 'Painter', hours: perSqft(sqft, 0.025, 4), hourlyRate: 52 },
    ],
    defaultMultipliers: { overheadRate: 0.08, taxRate: 0.07, profitMarginRate: 0.18 },
  },

  'painting-exterior': {
    id: 'painting-exterior',
    name: 'Exterior Painting',
    description: 'Power wash, prime, and 2 coats exterior.',
    category: 'finishing',
    getMaterials: (sqft) => [
      { name: 'Exterior Paint (gal)', quantity: Math.ceil(sqft / 250), unit: 'gal', unitCost: 52 },
      { name: 'Primer (gal)', quantity: Math.ceil(sqft / 350), unit: 'gal', unitCost: 35 },
      { name: 'Caulking (tube)', quantity: Math.ceil(sqft / 200), unit: 'tube', unitCost: 8 },
    ],
    getLabor: (sqft) => [
      { trade: 'Exterior Painter', hours: perSqft(sqft, 0.035, 8), hourlyRate: 58 },
      { trade: 'Painter Helper', hours: perSqft(sqft, 0.02, 4), hourlyRate: 38 },
    ],
    defaultMultipliers: { overheadRate: 0.10, taxRate: 0.07, profitMarginRate: 0.20 },
  },

  'electrical-rough': {
    id: 'electrical-rough',
    name: 'Electrical Rough-In',
    description: 'Panel, circuit runs, boxes, and rough-in wiring.',
    category: 'utilities',
    getMaterials: (sqft) => [
      { name: '14/2 Romex (LF)', quantity: perSqft(sqft, 3), unit: 'LF', unitCost: 0.65 },
      { name: '12/2 Romex (LF)', quantity: perSqft(sqft, 1.5), unit: 'LF', unitCost: 0.90 },
      { name: 'Outlet Boxes', quantity: perSqft(sqft, 0.08), unit: 'each', unitCost: 3.50 },
      { name: '200A Panel', quantity: 1, unit: 'each', unitCost: 650 },
      { name: 'Circuit Breakers (each)', quantity: Math.ceil(sqft / 200), unit: 'each', unitCost: 18 },
    ],
    getLabor: (sqft) => [
      { trade: 'Electrician', hours: perSqft(sqft, 0.05, 8), hourlyRate: 92 },
      { trade: 'Electrical Apprentice', hours: perSqft(sqft, 0.04, 4), hourlyRate: 48 },
    ],
    defaultMultipliers: { overheadRate: 0.12, taxRate: 0.07, profitMarginRate: 0.22 },
  },

  'plumbing-rough': {
    id: 'plumbing-rough',
    name: 'Plumbing Rough-In',
    description: 'Supply and drain rough-in for residential new construction.',
    category: 'utilities',
    getMaterials: (sqft) => [
      { name: '3/4" PEX Pipe (LF)', quantity: perSqft(sqft, 2), unit: 'LF', unitCost: 0.75 },
      { name: '1/2" PEX Pipe (LF)', quantity: perSqft(sqft, 3), unit: 'LF', unitCost: 0.55 },
      { name: '3" ABS Drain (LF)', quantity: perSqft(sqft, 0.5), unit: 'LF', unitCost: 4.20 },
      { name: 'PEX Fittings', quantity: perSqft(sqft, 0.3), unit: 'each', unitCost: 3.80 },
      { name: 'Water Heater (50 gal)', quantity: 1, unit: 'each', unitCost: 680 },
    ],
    getLabor: (sqft) => [
      { trade: 'Plumber', hours: perSqft(sqft, 0.04, 8), hourlyRate: 88 },
      { trade: 'Plumbing Apprentice', hours: perSqft(sqft, 0.03, 4), hourlyRate: 46 },
    ],
    defaultMultipliers: { overheadRate: 0.12, taxRate: 0.07, profitMarginRate: 0.22 },
  },
};

/** Get template by ID, null if not found. */
export function getTemplate(id: TemplateId): EstimateTemplate | null {
  return ESTIMATE_TEMPLATES[id] ?? null;
}

/** Build a full EstimateInput from a template + sqft. */
export function buildFromTemplate(templateId: TemplateId, sqft: number): EstimateInput {
  const tmpl = ESTIMATE_TEMPLATES[templateId];
  if (!tmpl) throw new Error(`Template not found: ${templateId}`);
  return {
    materials: tmpl.getMaterials(sqft),
    labor: tmpl.getLabor(sqft),
    multipliers: tmpl.defaultMultipliers,
  };
}

/** List all templates, optionally filtered by category. */
export function listTemplates(category?: EstimateTemplate['category']): EstimateTemplate[] {
  const all = Object.values(ESTIMATE_TEMPLATES);
  return category ? all.filter((t) => t.category === category) : all;
}
