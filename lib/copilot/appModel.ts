export type TemplateId =
  | 'framing-contractor'
  | 'window-door-installer'
  | 'builder-investor'
  | 'roofing-contractor'
  | 'electrical-contractor'
  | 'plumbing-contractor'
  | 'hvac-contractor'
  | 'painting-contractor'
  | 'flooring-contractor'
  | 'landscaping-contractor'
  | 'concrete-contractor'
  | 'kitchen-remodeler'
  | 'bath-remodeler'
  | 'siding-contractor'
  | 'drywall-contractor'
  | 'masonry-contractor'
  | 'fencing-contractor'
  | 'solar-installer'
  | 'excavation-contractor'
  | 'garage-door-contractor';

export type AppSection = {
  id: string;
  type: 'hero' | 'services' | 'testimonials' | 'contact' | 'cta' | 'custom';
  title: string;
  content: string;
};

export type LeadRow = {
  id: string;
  name: string;
  service: string;
  status: 'new' | 'qualified' | 'proposal-sent' | 'won' | 'lost';
  value: number;
};

export type PipelineStage = {
  id: string;
  name: string;
  count: number;
};

export type AppModel = {
  pages: Array<{
    id: string;
    name: string;
    path: string;
    sections: AppSection[];
  }>;
  components: Array<{ id: string; kind: string; props: Record<string, unknown> }>;
  crm: {
    leads: LeadRow[];
    pipeline: PipelineStage[];
    schema: Array<{ key: string; label: string; type: 'text' | 'number' | 'date' | 'select' }>;
  };
  jobs: Array<{ id: string; title: string; stage: string; estimate: number }>;
  automations: Array<{ id: string; name: string; trigger: string; action: string }>;
  estimateSettings: {
    defaultMargin: number;
    laborRate: number;
    taxRate: number;
  };
  business_profile: {
    name: string;
    location: string;
    services: string[];
    phone?: string;
    website?: string;
  };
  demo_project: {
    title: string;
    estimate: number;
    margin: number;
  };
};

export type AppAction =
  | { type: 'add_section'; pageId: string; sectionType: AppSection['type']; title: string; content: string }
  | { type: 'update_section_text'; pageId: string; sectionId: string; content: string }
  | { type: 'add_lead'; name: string; service: string; value: number }
  | { type: 'add_crm_field'; key: string; label: string; fieldType: 'text' | 'number' | 'date' | 'select' }
  | { type: 'remove_crm_field'; key: string }
  | { type: 'create_automation'; name: string; trigger: string; action: string }
  | { type: 'update_estimate_settings'; defaultMargin?: number; laborRate?: number; taxRate?: number }
  | { type: 'set_business_profile'; name?: string; location?: string; services?: string[]; phone?: string; website?: string }
  | { type: 'create_demo_project'; title: string; estimate: number; margin: number };

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createTemplateModel(templateId: TemplateId): AppModel {
  const templateMap: Record<TemplateId, { name: string; location: string; services: string[] }> = {
    'framing-contractor': {
      name: 'Precision Framing Co.',
      location: 'Burnsville, MN',
      services: ['Custom framing', 'Deck framing', 'Garage framing'],
    },
    'window-door-installer': {
      name: 'NorthStar Window & Door',
      location: 'Eagan, MN',
      services: ['Window installation', 'Door replacement', 'Trim finishing'],
    },
    'builder-investor': {
      name: 'Summit Builder Investor Group',
      location: 'Minneapolis, MN',
      services: ['Fix and flip projects', 'Full remodels', 'Ground-up builds'],
    },
    'roofing-contractor': {
      name: 'Ironclad Roofing Co.',
      location: 'Dallas, TX',
      services: ['Roof replacement', 'Storm restoration', 'Gutter systems'],
    },
    'electrical-contractor': {
      name: 'Voltline Electrical',
      location: 'Phoenix, AZ',
      services: ['Panel upgrades', 'EV charger installs', 'Whole-home rewiring'],
    },
    'plumbing-contractor': {
      name: 'RapidFlow Plumbing',
      location: 'Austin, TX',
      services: ['Water heater install', 'Leak repair', 'Repipes'],
    },
    'hvac-contractor': {
      name: 'NorthPeak HVAC',
      location: 'Denver, CO',
      services: ['AC replacement', 'Furnace install', 'Seasonal maintenance'],
    },
    'painting-contractor': {
      name: 'Prime Coat Painting',
      location: 'Nashville, TN',
      services: ['Interior painting', 'Exterior painting', 'Cabinet refinishing'],
    },
    'flooring-contractor': {
      name: 'SolidStep Flooring',
      location: 'Charlotte, NC',
      services: ['LVP installation', 'Hardwood refinish', 'Tile flooring'],
    },
    'landscaping-contractor': {
      name: 'Greenline Landscape',
      location: 'Orlando, FL',
      services: ['Landscape design', 'Paver patios', 'Irrigation installs'],
    },
    'concrete-contractor': {
      name: 'Atlas Concrete Works',
      location: 'Kansas City, MO',
      services: ['Driveways', 'Foundations', 'Stamped concrete'],
    },
    'kitchen-remodeler': {
      name: 'Craftline Kitchens',
      location: 'Chicago, IL',
      services: ['Kitchen remodels', 'Cabinet upgrades', 'Countertop installs'],
    },
    'bath-remodeler': {
      name: 'Modern Bath Studio',
      location: 'Columbus, OH',
      services: ['Bathroom remodels', 'Walk-in showers', 'Tile + vanity upgrades'],
    },
    'siding-contractor': {
      name: 'Shield Siding Group',
      location: 'Indianapolis, IN',
      services: ['Vinyl siding', 'Fiber cement siding', 'Trim wrap'],
    },
    'drywall-contractor': {
      name: 'Precision Drywall Pro',
      location: 'Raleigh, NC',
      services: ['Drywall install', 'Drywall repair', 'Texture finishing'],
    },
    'masonry-contractor': {
      name: 'Legacy Masonry',
      location: 'St. Louis, MO',
      services: ['Brickwork', 'Stone veneer', 'Chimney repair'],
    },
    'fencing-contractor': {
      name: 'Summit Fence Co.',
      location: 'Boise, ID',
      services: ['Wood fencing', 'Vinyl fencing', 'Gate automation'],
    },
    'solar-installer': {
      name: 'SunGrid Installers',
      location: 'San Diego, CA',
      services: ['Solar panel install', 'Battery backup', 'System monitoring'],
    },
    'excavation-contractor': {
      name: 'TrueGrade Excavation',
      location: 'Omaha, NE',
      services: ['Site prep', 'Trenching', 'Drainage grading'],
    },
    'garage-door-contractor': {
      name: 'LiftLine Garage Doors',
      location: 'Tulsa, OK',
      services: ['Garage door install', 'Opener replacement', 'Emergency repairs'],
    },
  };

  const template = templateMap[templateId];

  return {
    pages: [
      {
        id: 'home',
        name: 'Home',
        path: '/',
        sections: [
          { id: id('section'), type: 'hero', title: `${template.name} - Trusted Local Team`, content: 'High-converting headline + quote request CTA + trust badges.' },
          { id: id('section'), type: 'services', title: 'Services', content: template.services.join(', ') },
          { id: id('section'), type: 'contact', title: 'Contact', content: `Call now for a quote in ${template.location}.` },
        ],
      },
    ],
    components: [
      { id: id('component'), kind: 'lead-form', props: { fields: ['name', 'phone', 'email', 'project'] } },
      { id: id('component'), kind: 'estimate-widget', props: { mode: 'range' } },
    ],
    crm: {
      leads: [
        { id: id('lead'), name: 'Sarah Johnson', service: template.services[0], status: 'new', value: 9800 },
        { id: id('lead'), name: 'Mark Evans', service: template.services[1] || template.services[0], status: 'qualified', value: 12700 },
      ],
      pipeline: [
        { id: id('stage'), name: 'New', count: 8 },
        { id: id('stage'), name: 'Qualified', count: 5 },
        { id: id('stage'), name: 'Proposal Sent', count: 3 },
        { id: id('stage'), name: 'Won', count: 2 },
      ],
      schema: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'service', label: 'Service', type: 'text' },
        { key: 'projectValue', label: 'Project Value', type: 'number' },
      ],
    },
    jobs: [
      { id: id('job'), title: 'Demo Deck Build 12x16', stage: 'estimating', estimate: 7800 },
    ],
    automations: [
      { id: id('auto'), name: 'Missed Call Text Back', trigger: 'missed_call', action: 'send_sms_and_create_lead' },
      { id: id('auto'), name: 'Estimate Follow-up', trigger: 'estimate_sent', action: 'send_day_1_day_3_day_7_sequence' },
    ],
    estimateSettings: {
      defaultMargin: 0.32,
      laborRate: 55,
      taxRate: 0.075,
    },
    business_profile: {
      name: template.name,
      location: template.location,
      services: template.services,
    },
    demo_project: {
      title: 'Demo Project',
      estimate: 8500,
      margin: 0.32,
    },
  };
}

export function applyAction(model: AppModel, action: AppAction): AppModel {
  const next: AppModel = JSON.parse(JSON.stringify(model));

  if (action.type === 'add_section') {
    const page = next.pages.find((item) => item.id === action.pageId);
    if (!page) return next;
    page.sections.push({
      id: id('section'),
      type: action.sectionType,
      title: action.title,
      content: action.content,
    });
    return next;
  }

  if (action.type === 'update_section_text') {
    const page = next.pages.find((item) => item.id === action.pageId);
    const section = page?.sections.find((item) => item.id === action.sectionId);
    if (section) section.content = action.content;
    return next;
  }

  if (action.type === 'add_lead') {
    next.crm.leads.unshift({
      id: id('lead'),
      name: action.name,
      service: action.service,
      value: action.value,
      status: 'new',
    });
    const newStage = next.crm.pipeline.find((stage) => stage.name === 'New');
    if (newStage) newStage.count += 1;
    return next;
  }

  if (action.type === 'add_crm_field') {
    const exists = next.crm.schema.some((field) => field.key === action.key);
    if (!exists) {
      next.crm.schema.push({
        key: action.key,
        label: action.label,
        type: action.fieldType,
      });
    }
    return next;
  }

  if (action.type === 'remove_crm_field') {
    next.crm.schema = next.crm.schema.filter((field) => field.key !== action.key);
    return next;
  }

  if (action.type === 'create_automation') {
    next.automations.unshift({
      id: id('auto'),
      name: action.name,
      trigger: action.trigger,
      action: action.action,
    });
    return next;
  }

  if (action.type === 'update_estimate_settings') {
    next.estimateSettings = {
      defaultMargin: action.defaultMargin ?? next.estimateSettings.defaultMargin,
      laborRate: action.laborRate ?? next.estimateSettings.laborRate,
      taxRate: action.taxRate ?? next.estimateSettings.taxRate,
    };
    return next;
  }

  if (action.type === 'set_business_profile') {
    next.business_profile = {
      ...next.business_profile,
      ...(action.name ? { name: action.name } : {}),
      ...(action.location ? { location: action.location } : {}),
      ...(action.services ? { services: action.services } : {}),
      ...(action.phone ? { phone: action.phone } : {}),
      ...(action.website ? { website: action.website } : {}),
    };
    return next;
  }

  if (action.type === 'create_demo_project') {
    next.demo_project = {
      title: action.title,
      estimate: action.estimate,
      margin: action.margin,
    };
    next.jobs.unshift({ id: id('job'), title: action.title, stage: 'estimating', estimate: action.estimate });
    return next;
  }

  return next;
}
