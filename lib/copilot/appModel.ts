export type TemplateId = 'framing-contractor' | 'window-door-installer' | 'builder-investor';

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
  };
  jobs: Array<{ id: string; title: string; stage: string; estimate: number }>;
  automations: Array<{ id: string; name: string; trigger: string; action: string }>;
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
    },
    jobs: [
      { id: id('job'), title: 'Demo Deck Build 12x16', stage: 'estimating', estimate: 7800 },
    ],
    automations: [
      { id: id('auto'), name: 'Missed Call Text Back', trigger: 'missed_call', action: 'send_sms_and_create_lead' },
      { id: id('auto'), name: 'Estimate Follow-up', trigger: 'estimate_sent', action: 'send_day_1_day_3_day_7_sequence' },
    ],
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
