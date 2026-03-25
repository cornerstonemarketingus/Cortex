export type ContractorTier = 'starter' | 'pro' | 'premium';
export type AssignmentMode = 'claim' | 'auto-assign';

export type MarketplaceLeadInput = {
  serviceType: string;
  projectType: string;
  budgetUsd: number;
  timelineDays: number;
  zipCode: string;
  homeownerName?: string;
  notes?: string;
};

export type IntegrationStatus = {
  id: 'stripe' | 'twilio' | 'google-maps' | 'sendgrid' | 'godaddy' | 'namecheap';
  label: string;
  configured: boolean;
  requiredForPhaseOne: boolean;
  envVars: string[];
  nextStep: string;
};

export type ContractorProfile = {
  id: string;
  name: string;
  serviceTypes: string[];
  serviceAreaPrefixes: string[];
  hqLat: number;
  hqLng: number;
  tier: ContractorTier;
  responseTimeMinutes: number;
  winRate: number;
  rating: number;
  jobsCompleted: number;
  verified: boolean;
  autoAssignEnabled: boolean;
  subscriptionActive: boolean;
};

export type RankedContractor = ContractorProfile & {
  routingScore: number;
  proximityScore: number;
  speedScore: number;
  performanceScore: number;
  tierScore: number;
  trustScore: number;
  mapsDistanceKm?: number;
  mapsTravelMinutes?: number;
  mapsScore?: number;
  reasons: string[];
};

export type IntentScoreBreakdown = {
  score: number;
  band: 'high-intent' | 'medium-intent' | 'low-intent';
  components: {
    budget: number;
    urgency: number;
    projectComplexity: number;
    dataQuality: number;
  };
  premiumLeadPriceUsd: number;
};

export type MarketplaceRoutingOutput = {
  lead: MarketplaceLeadInput;
  intent: IntentScoreBreakdown;
  assignmentMode: AssignmentMode;
  rankedContractors: RankedContractor[];
  assignment: {
    status: 'assigned' | 'claim-window-open';
    assignedContractorId?: string;
    assignedContractorName?: string;
    claimWindowMinutes?: number;
    claimQueue?: Array<{ contractorId: string; contractorName: string; routingScore: number }>;
  };
  speedAdvantage: {
    benchmarkFirstResponseMinutes: number;
    expectedBestResponseMinutes: number;
    notes: string[];
  };
  monetization: {
    recommendedLeadPriceUsd: number;
    premiumPlacementAvailable: boolean;
    subscriptionUpsell: string;
  };
};

const CONTRACTOR_SEED: ContractorProfile[] = [
  {
    id: 'ctr-001',
    name: 'Northline Roofing Group',
    serviceTypes: ['roofing', 'exterior', 'general-construction'],
    serviceAreaPrefixes: ['551', '550', '554'],
    hqLat: 44.9555,
    hqLng: -93.0913,
    tier: 'premium',
    responseTimeMinutes: 4,
    winRate: 0.46,
    rating: 4.9,
    jobsCompleted: 312,
    verified: true,
    autoAssignEnabled: true,
    subscriptionActive: true,
  },
  {
    id: 'ctr-002',
    name: 'Twin Cities Remodel Pros',
    serviceTypes: ['bathroom-remodel', 'kitchen-remodel', 'general-construction'],
    serviceAreaPrefixes: ['551', '553', '554'],
    hqLat: 44.9778,
    hqLng: -93.265,
    tier: 'pro',
    responseTimeMinutes: 11,
    winRate: 0.39,
    rating: 4.7,
    jobsCompleted: 205,
    verified: true,
    autoAssignEnabled: true,
    subscriptionActive: true,
  },
  {
    id: 'ctr-003',
    name: 'Summit Deck and Outdoor',
    serviceTypes: ['deck', 'outdoor', 'general-construction'],
    serviceAreaPrefixes: ['551', '550'],
    hqLat: 44.913,
    hqLng: -93.188,
    tier: 'starter',
    responseTimeMinutes: 17,
    winRate: 0.27,
    rating: 4.5,
    jobsCompleted: 93,
    verified: true,
    autoAssignEnabled: false,
    subscriptionActive: true,
  },
  {
    id: 'ctr-004',
    name: 'Rapid HVAC and Mechanical',
    serviceTypes: ['hvac', 'mechanical', 'electrical'],
    serviceAreaPrefixes: ['551', '554', '553'],
    hqLat: 45.0159,
    hqLng: -93.247,
    tier: 'premium',
    responseTimeMinutes: 6,
    winRate: 0.43,
    rating: 4.8,
    jobsCompleted: 264,
    verified: true,
    autoAssignEnabled: true,
    subscriptionActive: true,
  },
  {
    id: 'ctr-005',
    name: 'Metro Budget Contractors',
    serviceTypes: ['general-construction', 'cleaning', 'landscaping'],
    serviceAreaPrefixes: ['551', '552', '553', '554'],
    hqLat: 44.943,
    hqLng: -93.285,
    tier: 'pro',
    responseTimeMinutes: 22,
    winRate: 0.24,
    rating: 4.2,
    jobsCompleted: 148,
    verified: false,
    autoAssignEnabled: false,
    subscriptionActive: true,
  },
  {
    id: 'ctr-006',
    name: 'Starlight Cleaning Systems',
    serviceTypes: ['cleaning'],
    serviceAreaPrefixes: ['551', '550', '553'],
    hqLat: 44.965,
    hqLng: -93.207,
    tier: 'starter',
    responseTimeMinutes: 9,
    winRate: 0.31,
    rating: 4.6,
    jobsCompleted: 172,
    verified: true,
    autoAssignEnabled: true,
    subscriptionActive: false,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeZipPrefix(zipCode: string): string {
  return zipCode.replace(/[^0-9]/g, '').slice(0, 3);
}

function getProximityScore(zipCode: string, serviceAreaPrefixes: string[]): number {
  const zipPrefix = normalizeZipPrefix(zipCode);
  if (!zipPrefix) return 0;

  if (serviceAreaPrefixes.includes(zipPrefix)) return 18;
  if (serviceAreaPrefixes.some((prefix) => prefix.slice(0, 2) === zipPrefix.slice(0, 2))) return 10;
  return 0;
}

function getTierScore(tier: ContractorTier): number {
  if (tier === 'premium') return 24;
  if (tier === 'pro') return 16;
  return 8;
}

function getProjectComplexity(serviceType: string, projectType: string): number {
  const normalized = `${serviceType} ${projectType}`.toLowerCase();
  if (/roof|kitchen|bathroom|electrical|hvac/.test(normalized)) return 22;
  if (/deck|remodel|landscap|plumb/.test(normalized)) return 16;
  return 10;
}

function computeIntent(lead: MarketplaceLeadInput): IntentScoreBreakdown {
  const budget = clamp(
    lead.budgetUsd >= 20000 ? 30 : lead.budgetUsd >= 10000 ? 22 : lead.budgetUsd >= 4000 ? 15 : 8,
    0,
    30
  );

  const urgency = clamp(
    lead.timelineDays <= 3 ? 30 : lead.timelineDays <= 14 ? 22 : lead.timelineDays <= 45 ? 14 : 8,
    0,
    30
  );

  const projectComplexity = getProjectComplexity(lead.serviceType, lead.projectType);
  const dataQuality = clamp(
    (lead.notes?.trim() ? 10 : 4) + (lead.homeownerName?.trim() ? 8 : 4),
    0,
    20
  );

  const score = clamp(Math.round(budget + urgency + projectComplexity + dataQuality), 0, 100);
  const band = score >= 75 ? 'high-intent' : score >= 45 ? 'medium-intent' : 'low-intent';
  const premiumMultiplier = band === 'high-intent' ? 1.45 : band === 'medium-intent' ? 1.2 : 1;

  const premiumLeadPriceUsd = Math.round((45 + score * 1.2) * premiumMultiplier);

  return {
    score,
    band,
    components: {
      budget,
      urgency,
      projectComplexity,
      dataQuality,
    },
    premiumLeadPriceUsd,
  };
}

function rankContractors(lead: MarketplaceLeadInput): RankedContractor[] {
  return CONTRACTOR_SEED
    .filter((contractor) =>
      contractor.serviceTypes.some(
        (service) => service.toLowerCase() === lead.serviceType.toLowerCase() || service === 'general-construction'
      )
    )
    .map((contractor) => {
      const proximityScore = getProximityScore(lead.zipCode, contractor.serviceAreaPrefixes);
      const speedScore = clamp(24 - contractor.responseTimeMinutes * 0.9, 0, 24);
      const performanceScore = clamp(contractor.winRate * 40, 0, 24);
      const tierScore = getTierScore(contractor.tier);
      const trustScore = clamp((contractor.rating / 5) * 14 + (contractor.verified ? 6 : 0), 0, 20);

      const routingScore = Math.round(
        proximityScore + speedScore + performanceScore + tierScore + trustScore
      );

      const reasons = [
        proximityScore >= 15 ? 'Strong service-area proximity match' : 'Regional coverage match',
        contractor.responseTimeMinutes <= 6 ? 'Fast first-response benchmark' : 'Reliable response SLA',
        contractor.winRate >= 0.4 ? 'High close-rate performance' : 'Stable close-rate history',
        contractor.tier === 'premium' ? 'Premium subscription priority' : 'Standard subscription placement',
      ];

      return {
        ...contractor,
        routingScore,
        proximityScore,
        speedScore: Math.round(speedScore),
        performanceScore: Math.round(performanceScore),
        tierScore,
        trustScore: Math.round(trustScore),
        reasons,
      };
    })
    .sort((a, b) => b.routingScore - a.routingScore)
    .slice(0, 5);
}

function buildAssignment(
  contractors: RankedContractor[],
  mode: AssignmentMode,
  claimWindowMinutes = 15
): MarketplaceRoutingOutput['assignment'] {
  if (mode === 'auto-assign') {
    const assigned = contractors.find((contractor) => contractor.autoAssignEnabled && contractor.subscriptionActive);
    if (assigned) {
      return {
        status: 'assigned',
        assignedContractorId: assigned.id,
        assignedContractorName: assigned.name,
      };
    }
  }

  return {
    status: 'claim-window-open',
    claimWindowMinutes,
    claimQueue: contractors.slice(0, 3).map((contractor) => ({
      contractorId: contractor.id,
      contractorName: contractor.name,
      routingScore: contractor.routingScore,
    })),
  };
}

function hasRequiredEnv(vars: string[]): boolean {
  return vars.every((name) => {
    const value = process.env[name];
    return Boolean(value && value.trim().length > 0);
  });
}

export function getMarketplaceIntegrations(): IntegrationStatus[] {
  return [
    {
      id: 'stripe',
      label: 'Stripe payments + subscriptions',
      configured: hasRequiredEnv(['STRIPE_SECRET_KEY']),
      requiredForPhaseOne: true,
      envVars: ['STRIPE_SECRET_KEY'],
      nextStep: 'Enable contractor subscription billing and lead purchase checkout flow.',
    },
    {
      id: 'twilio',
      label: 'Twilio communications layer',
      configured: hasRequiredEnv(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN']),
      requiredForPhaseOne: true,
      envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_MESSAGING_SERVICE_SID'],
      nextStep: 'Activate instant lead SMS, homeowner auto-reply, and call-tracking webhooks.',
    },
    {
      id: 'google-maps',
      label: 'Google Maps service-area routing',
      configured: hasRequiredEnv(['GOOGLE_MAPS_API_KEY']),
      requiredForPhaseOne: true,
      envVars: ['GOOGLE_MAPS_API_KEY'],
      nextStep: 'Enable proximity ranking and premium territory locking.',
    },
    {
      id: 'sendgrid',
      label: 'SendGrid lead alerts + onboarding',
      configured: hasRequiredEnv(['SENDGRID_API_KEY']),
      requiredForPhaseOne: true,
      envVars: ['SENDGRID_API_KEY'],
      nextStep: 'Trigger lead alerts, onboarding sequences, and drip follow-up tracks.',
    },
    {
      id: 'godaddy',
      label: 'GoDaddy domain launch integration',
      configured: hasRequiredEnv(['GODADDY_API_KEY', 'GODADDY_API_SECRET']),
      requiredForPhaseOne: false,
      envVars: ['GODADDY_API_KEY', 'GODADDY_API_SECRET'],
      nextStep: 'Support in-app domain purchase and one-click site binding.',
    },
    {
      id: 'namecheap',
      label: 'Namecheap domain launch integration',
      configured: hasRequiredEnv(['NAMECHEAP_API_USER', 'NAMECHEAP_API_KEY']),
      requiredForPhaseOne: false,
      envVars: ['NAMECHEAP_API_USER', 'NAMECHEAP_API_KEY'],
      nextStep: 'Offer domain buy + auto-connect flow from builder to live site.',
    },
  ];
}

export function routeMarketplaceLead(input: {
  lead: MarketplaceLeadInput;
  assignmentMode: AssignmentMode;
  claimWindowMinutes?: number;
}): MarketplaceRoutingOutput {
  const rankedContractors = rankContractors(input.lead);
  const intent = computeIntent(input.lead);
  const assignment = buildAssignment(rankedContractors, input.assignmentMode, input.claimWindowMinutes);

  return {
    lead: input.lead,
    intent,
    assignmentMode: input.assignmentMode,
    rankedContractors,
    assignment,
    speedAdvantage: {
      benchmarkFirstResponseMinutes: 15,
      expectedBestResponseMinutes: rankedContractors[0]?.responseTimeMinutes ?? 15,
      notes: [
        'Faster contractors receive placement lift in ranking.',
        'Time-to-first-response is weighted directly in routing score.',
        'Win rate and response speed together determine premium distribution.',
      ],
    },
    monetization: {
      recommendedLeadPriceUsd: intent.premiumLeadPriceUsd,
      premiumPlacementAvailable: intent.band === 'high-intent',
      subscriptionUpsell:
        input.assignmentMode === 'auto-assign'
          ? 'Auto-assign mode reserved for premium subscription tier.'
          : 'Upgrade to premium for auto-assign and priority placement.',
    },
  };
}

type GeoPoint = {
  lat: number;
  lng: number;
};

type MapsTravelMetric = {
  distanceKm: number;
  travelMinutes: number;
};

async function geocodeZipToPoint(zipCode: string, apiKey: string): Promise<GeoPoint | null> {
  const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    zipCode
  )}&components=country:US&key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => ({}))) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  };

  if (payload.status !== 'OK') {
    return null;
  }

  const location = payload.results?.[0]?.geometry?.location;
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
    return null;
  }

  return {
    lat: Number(location.lat),
    lng: Number(location.lng),
  };
}

async function fetchMapsTravelMetrics(
  origin: GeoPoint,
  contractors: ContractorProfile[],
  apiKey: string
): Promise<Array<MapsTravelMetric | null>> {
  if (contractors.length === 0) {
    return [];
  }

  const destinations = contractors.map((contractor) => `${contractor.hqLat},${contractor.hqLng}`).join('|');
  const endpoint =
    'https://maps.googleapis.com/maps/api/distancematrix/json' +
    `?origins=${encodeURIComponent(`${origin.lat},${origin.lng}`)}` +
    `&destinations=${encodeURIComponent(destinations)}` +
    '&mode=driving&units=imperial' +
    `&key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    return contractors.map(() => null);
  }

  const payload = (await response.json().catch(() => ({}))) as {
    status?: string;
    rows?: Array<{
      elements?: Array<{
        status?: string;
        distance?: { value?: number };
        duration?: { value?: number };
      }>;
    }>;
  };

  const elements = payload.rows?.[0]?.elements;
  if (!elements || payload.status !== 'OK') {
    return contractors.map(() => null);
  }

  return elements.map((element) => {
    if (
      element?.status !== 'OK' ||
      !Number.isFinite(element.distance?.value) ||
      !Number.isFinite(element.duration?.value)
    ) {
      return null;
    }

    const distanceMeters = Number(element.distance?.value);
    const durationSeconds = Number(element.duration?.value);

    return {
      distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
      travelMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    };
  });
}

function computeMapsScore(travelMinutes: number): number {
  if (travelMinutes <= 12) return 14;
  if (travelMinutes <= 20) return 11;
  if (travelMinutes <= 30) return 8;
  if (travelMinutes <= 45) return 4;
  if (travelMinutes <= 60) return 0;
  return -4;
}

export async function routeMarketplaceLeadWithMaps(input: {
  lead: MarketplaceLeadInput;
  assignmentMode: AssignmentMode;
  claimWindowMinutes?: number;
}): Promise<MarketplaceRoutingOutput> {
  const base = routeMarketplaceLead(input);
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!mapsApiKey || base.rankedContractors.length === 0) {
    return base;
  }

  try {
    const origin = await geocodeZipToPoint(input.lead.zipCode, mapsApiKey);
    if (!origin) {
      return {
        ...base,
        speedAdvantage: {
          ...base.speedAdvantage,
          notes: [...base.speedAdvantage.notes, 'Google Maps geocode unavailable; using service-area fallback scoring.'],
        },
      };
    }

    const metrics = await fetchMapsTravelMetrics(origin, base.rankedContractors, mapsApiKey);
    const rankedContractors = base.rankedContractors
      .map((contractor, index) => {
        const metric = metrics[index];
        if (!metric) return contractor;

        const mapsScore = computeMapsScore(metric.travelMinutes);
        const routingScore = contractor.routingScore + mapsScore;

        return {
          ...contractor,
          routingScore,
          mapsScore,
          mapsTravelMinutes: metric.travelMinutes,
          mapsDistanceKm: metric.distanceKm,
          reasons: [
            ...contractor.reasons,
            `Maps travel estimate ${metric.travelMinutes} min (${metric.distanceKm} km).`,
          ],
        };
      })
      .sort((a, b) => b.routingScore - a.routingScore)
      .slice(0, 5);

    return {
      ...base,
      rankedContractors,
      speedAdvantage: {
        ...base.speedAdvantage,
        expectedBestResponseMinutes: Math.min(
          base.speedAdvantage.expectedBestResponseMinutes,
          rankedContractors[0]?.mapsTravelMinutes || base.speedAdvantage.expectedBestResponseMinutes
        ),
        notes: [...base.speedAdvantage.notes, 'Google Maps travel-time weighting is active in contractor ranking.'],
      },
    };
  } catch {
    return {
      ...base,
      speedAdvantage: {
        ...base.speedAdvantage,
        notes: [...base.speedAdvantage.notes, 'Google Maps lookup failed; using service-area fallback scoring.'],
      },
    };
  }
}

export const MARKETPLACE_PHASE_ROADMAP = [
  {
    phase: 'Phase 1 (money now)',
    focus: [
      'Stripe payments + contractor subscriptions',
      'Lead scoring and smart routing engine',
      'Preferred contractor placement system',
    ],
  },
  {
    phase: 'Phase 2',
    focus: [
      'Verticalized contractor website generator templates',
      'Domain purchase + hosting launch integrations',
      'Basic CRM + automation activation for every launch',
    ],
  },
  {
    phase: 'Phase 3',
    focus: [
      'AI app builder for business-system generation',
      'Multi-industry expansion beyond contractors',
      'Advanced marketplace analytics and territory intelligence',
    ],
  },
] as const;
