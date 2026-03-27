import type { AppAction } from '@/lib/copilot/appModel';

export type CopilotMode = 'EXECUTE' | 'DISCUSS' | 'CONFIRM';

export type CopilotContext = {
  currentPage?: string;
  selectedLeadId?: string;
  selectedEstimateId?: string;
};

export type CopilotCommandResponse = {
  mode: CopilotMode;
  intent: string;
  actions: AppAction[];
  discussion?: string;
  preview?: {
    summary: string;
    impact: string;
  };
  requires_confirmation?: boolean;
  confidence?: number;
  ui_feedback: {
    message: string;
    highlight?: string;
  };
  suggestions: string[];
};

function suggestionSet(...items: string[]) {
  return Array.from(new Set(items));
}

function inferIntentConfidence(message: string): number {
  const msg = message.toLowerCase();
  if (msg.includes('build') || msg.includes('create') || msg.includes('add') || msg.includes('turn on')) return 0.9;
  if (msg.includes('help') || msg.includes('maybe') || msg.includes('not sure')) return 0.55;
  return 0.72;
}

function buildDiscussResponse(message: string): CopilotCommandResponse {
  const lowered = message.toLowerCase();
  const isWebsite = lowered.includes('website') || lowered.includes('page');
  const isEstimate = lowered.includes('estimate') || lowered.includes('price');

  const lines = [
    'Strategy plan:',
    isWebsite ? '- Focus on hero, services, proof, and one primary CTA.' : '- Define the highest-value flow first.',
    isEstimate ? '- Capture project type, budget, and timeline before drafting line items.' : '- Capture lead qualification criteria early.',
    '- Add automation triggers for no-response and estimate follow-up.',
    '- Keep copilot in control loop: suggest, execute, confirm.',
  ].join('\n');

  return {
    mode: 'DISCUSS',
    intent: 'DISCUSS_PLAN',
    actions: [],
    discussion: lines,
    confidence: 1,
    ui_feedback: {
      message: 'Discuss mode active. I mapped the plan and next steps without executing changes.',
      highlight: 'copilot',
    },
    suggestions: suggestionSet('Build This', 'Switch to Execute', 'Use Confirm mode for risky updates'),
  };
}

export function parseCommandToActions(message: string, context: CopilotContext, mode: CopilotMode = 'EXECUTE'): CopilotCommandResponse {
  const text = message.trim();
  const msg = text.toLowerCase();
  const pageId = context.currentPage || 'home';
  const confidence = inferIntentConfidence(text);

  if (mode === 'DISCUSS') {
    return buildDiscussResponse(message);
  }

  if (mode === 'EXECUTE' && confidence < 0.6) {
    return {
      mode,
      intent: 'CLARIFICATION_REQUIRED',
      actions: [],
      confidence,
      ui_feedback: {
        message: 'I need a bit more detail before building. What project type and target timeline should I use?',
        highlight: 'copilot',
      },
      suggestions: suggestionSet('Create estimate for a deck within 30 days', 'Build my website for roofing business'),
    };
  }

  if (msg.includes('build my website') || msg.includes('generate website')) {
    return {
      mode,
      intent: 'CREATE_FULL_WEBSITE',
      actions: [
        { type: 'generate_full_website', pageId },
        {
          type: 'add_section',
          pageId,
          sectionType: 'testimonials',
          title: 'Trusted By Homeowners',
          content: 'Add three local contractor testimonials focused on speed and craftsmanship.',
        },
      ],
      ui_feedback: {
        message: 'Website structure generated and trust sections added.',
        highlight: 'website',
      },
      confidence,
      suggestions: suggestionSet('Publish website', 'Create estimate', 'Enable Autopilot mode'),
    };
  }

  if (msg.includes('add testimonials')) {
    return {
      mode,
      intent: 'ADD_WEBSITE_SECTION',
      actions: [
        {
          type: 'add_section',
          pageId,
          sectionType: 'testimonials',
          title: 'Client Testimonials',
          content: 'Three reviews highlighting close-rate and fast estimate turnaround.',
        },
      ],
      ui_feedback: {
        message: 'Testimonials section added.',
        highlight: 'website',
      },
      confidence,
      suggestions: suggestionSet('Add services section', 'Publish website'),
    };
  }

  if (msg.includes('create estimate') || msg.includes('estimate for')) {
    const projectType = msg.includes('deck') ? 'deck' : msg.includes('roof') ? 'roof' : 'general-construction';
    return {
      mode,
      intent: 'CREATE_ESTIMATE',
      actions: [
        {
          type: 'create_estimate',
          projectType,
          budget: 18000,
          timeline: 'Within 30 days',
        },
      ],
      ui_feedback: {
        message: 'Estimate draft created with AI assumptions and confidence score.',
        highlight: 'estimates',
      },
      confidence,
      suggestions: suggestionSet('Send follow-up sequence', 'Create lead from estimate'),
    };
  }

  if (msg.includes('follow up') && msg.includes('lead')) {
    return {
      mode,
      intent: 'FOLLOW_UP_LEAD',
      actions: [
        {
          type: 'create_automation_sequence',
          name: 'Lead Follow-up Sequence',
          trigger: 'no_response_after_x_hours',
          steps: ['send_sms', 'send_email', 'send_reminder_notification'],
        },
      ],
      ui_feedback: {
        message: 'Follow-up sequence configured for lead recovery.',
        highlight: 'automations',
      },
      confidence,
      suggestions: suggestionSet('Enable missed-call text back', 'Enable Autopilot mode'),
    };
  }

  if (msg.includes('autopilot') || msg.includes('turn on autopilot')) {
    return {
      mode,
      intent: 'ENABLE_AUTOPILOT_MODE',
      actions: [{ type: 'enable_autopilot_bundle' }],
      ui_feedback: {
        message: 'Autopilot bundle enabled: lead capture, follow-up, estimate drafting, and nurture flows.',
        highlight: 'automations',
      },
      confidence,
      suggestions: suggestionSet('Review automation templates', 'Run automation test lead'),
    };
  }

  if (msg.includes('add lead')) {
    return {
      mode,
      intent: 'CREATE_LEAD',
      actions: [{ type: 'add_lead', name: 'New Lead', service: 'General project', value: 12000 }],
      ui_feedback: {
        message: 'Lead added to CRM pipeline.',
        highlight: 'leads',
      },
      confidence,
      suggestions: suggestionSet('Create estimate', 'Start follow-up sequence'),
    };
  }

  const baseResponse: CopilotCommandResponse = {
    mode,
    intent: 'NO_MATCH',
    actions: [],
    confidence,
    ui_feedback: {
      message: 'No direct action matched. Try: Build my website, Create estimate for a deck, Follow up with this lead, or Turn on autopilot.',
      highlight: 'copilot',
    },
    suggestions: suggestionSet('Build my website', 'Create estimate for a deck', 'Turn on autopilot'),
  };

  if (mode === 'CONFIRM') {
    const fallbackActions: AppAction[] = [{ type: 'enable_autopilot_bundle' }];
    return {
      ...baseResponse,
      intent: 'CONFIRM_AUTOPILOT_BUNDLE',
      actions: fallbackActions,
      preview: {
        summary: 'This will enable autopilot workflows: lead qualification, estimate draft automation, and follow-up sequences.',
        impact: 'No existing data will be deleted. New automation rules will be added.',
      },
      requires_confirmation: true,
      ui_feedback: {
        message: 'Confirm mode active. Review the proposed action bundle before execution.',
        highlight: 'automations',
      },
    };
  }

  return baseResponse;
}

export function validateAction(action: AppAction): string | null {
  if (!action || typeof action !== 'object' || !('type' in action)) {
    return 'Invalid action payload.';
  }

  if (action.type === 'add_section') {
    if (!action.pageId || !action.title || !action.content) {
      return 'add_section requires pageId, title, and content.';
    }
  }

  if (action.type === 'create_estimate') {
    if (!action.projectType) {
      return 'create_estimate requires projectType.';
    }
  }

  if (action.type === 'create_automation_sequence') {
    if (!action.name || !action.trigger || !Array.isArray(action.steps) || action.steps.length === 0) {
      return 'create_automation_sequence requires name, trigger, and steps.';
    }
  }

  return null;
}
