import type { AppAction } from '@/lib/copilot/appModel';

export type CopilotContext = {
  currentPage?: string;
  selectedLeadId?: string;
  selectedEstimateId?: string;
};

export type CopilotCommandResponse = {
  intent: string;
  actions: AppAction[];
  ui_feedback: {
    message: string;
    highlight?: string;
  };
  suggestions: string[];
};

function suggestionSet(...items: string[]) {
  return Array.from(new Set(items));
}

export function parseCommandToActions(message: string, context: CopilotContext): CopilotCommandResponse {
  const text = message.trim();
  const msg = text.toLowerCase();
  const pageId = context.currentPage || 'home';

  if (msg.includes('build my website') || msg.includes('generate website')) {
    return {
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
      suggestions: suggestionSet('Publish website', 'Create estimate', 'Enable Autopilot mode'),
    };
  }

  if (msg.includes('add testimonials')) {
    return {
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
      suggestions: suggestionSet('Add services section', 'Publish website'),
    };
  }

  if (msg.includes('create estimate') || msg.includes('estimate for')) {
    const projectType = msg.includes('deck') ? 'deck' : msg.includes('roof') ? 'roof' : 'general-construction';
    return {
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
      suggestions: suggestionSet('Send follow-up sequence', 'Create lead from estimate'),
    };
  }

  if (msg.includes('follow up') && msg.includes('lead')) {
    return {
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
      suggestions: suggestionSet('Enable missed-call text back', 'Enable Autopilot mode'),
    };
  }

  if (msg.includes('autopilot') || msg.includes('turn on autopilot')) {
    return {
      intent: 'ENABLE_AUTOPILOT_MODE',
      actions: [{ type: 'enable_autopilot_bundle' }],
      ui_feedback: {
        message: 'Autopilot bundle enabled: lead capture, follow-up, estimate drafting, and nurture flows.',
        highlight: 'automations',
      },
      suggestions: suggestionSet('Review automation templates', 'Run automation test lead'),
    };
  }

  if (msg.includes('add lead')) {
    return {
      intent: 'CREATE_LEAD',
      actions: [{ type: 'add_lead', name: 'New Lead', service: 'General project', value: 12000 }],
      ui_feedback: {
        message: 'Lead added to CRM pipeline.',
        highlight: 'leads',
      },
      suggestions: suggestionSet('Create estimate', 'Start follow-up sequence'),
    };
  }

  return {
    intent: 'NO_MATCH',
    actions: [],
    ui_feedback: {
      message: 'No direct action matched. Try: Build my website, Create estimate for a deck, Follow up with this lead, or Turn on autopilot.',
      highlight: 'copilot',
    },
    suggestions: suggestionSet('Build my website', 'Create estimate for a deck', 'Turn on autopilot'),
  };
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
