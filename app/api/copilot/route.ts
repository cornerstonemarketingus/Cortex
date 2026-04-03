import { NextResponse } from 'next/server';
import { llm } from '@/lib/llm/router';
import { buildFromTemplate, listTemplates } from '@/lib/estimator/templates';
import engine from '@/lib/estimator/engine';
import { createSection, DEFAULT_SECTION_PROPS, type SectionType } from '@/lib/builder/page-model';
import { generateWorkflowFromPrompt } from '@/lib/automation/engine';

export type CopilotActionType = 'CREATE_ESTIMATE' | 'CREATE_PAGE' | 'CREATE_AUTOMATION' | 'NOOP';

export interface CopilotResult {
  text: string;
  thinking: string[];
  action: {
    type: CopilotActionType;
    payload?: Record<string, unknown>;
  };
}

function detectIntent(input: string): CopilotActionType {
  const txt = input.toLowerCase();
  if (/estimate|quote|bid|sqft|square foot|square footage|material|labor|cost|price/.test(txt))
    return 'CREATE_ESTIMATE';
  if (/page|website|landing|hero|headline|section|layout|design|build.*site/.test(txt))
    return 'CREATE_PAGE';
  if (/automation|workflow|follow.?up|autopilot|sequence|trigger|notify|when.*then/.test(txt))
    return 'CREATE_AUTOMATION';
  return 'NOOP';
}

/** Extract sqft from natural language (e.g. "2000 sq ft" → 2000) */
function parseSqft(input: string): number {
  const m = input.match(/(\d[\d,]*)\s*(?:sq\.?\s*ft|square\s*feet|sqft)/i);
  if (m) return parseInt(m[1].replace(/,/g, ''), 10);
  const m2 = input.match(/(\d[\d,]+)/);
  if (m2) return Math.min(Math.max(parseInt(m2[1].replace(/,/g, ''), 10), 100), 50000);
  return 1500;
}

/** Pick nearest template based on user text */
function pickTemplate(input: string) {
  const txt = input.toLowerCase();
  const templates = listTemplates();
  const scored = templates.map((t) => {
    let score = 0;
    const terms = [t.name.toLowerCase(), t.category.toLowerCase(), ...t.description.toLowerCase().split(' ')];
    for (const term of terms) {
      if (txt.includes(term)) score++;
    }
    // Bonus keyword matches
    if (txt.includes('fram') && t.id.includes('framing')) score += 3;
    if ((txt.includes('roof') || txt.includes('shingle')) && t.id.includes('roofing')) score += 3;
    if (txt.includes('window') && t.id.includes('window')) score += 3;
    if (txt.includes('door') && t.id.includes('door')) score += 3;
    if (txt.includes('drywall') && t.id.includes('drywall')) score += 3;
    if ((txt.includes('floor') || txt.includes('hardwood') || txt.includes('tile')) && t.id.includes('flooring')) score += 3;
    if ((txt.includes('concrete') || txt.includes('foundation')) && t.id.includes('concrete')) score += 3;
    if ((txt.includes('paint') || txt.includes('color')) && t.id.includes('painting')) score += 3;
    if ((txt.includes('electric') || txt.includes('wiring')) && t.id.includes('electrical')) score += 3;
    if ((txt.includes('plumb') || txt.includes('pipe')) && t.id.includes('plumbing')) score += 3;
    return { template: t, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].template;
}

/** Decide which page sections to create from a user prompt */
function pickSections(input: string): SectionType[] {
  const txt = input.toLowerCase();
  const sections: SectionType[] = ['hero'];
  if (/service|what.*do|offer/.test(txt)) sections.push('services');
  if (/feature|benefit|why|advantage/.test(txt)) sections.push('features');
  if (/review|testimonial|client|customer/.test(txt)) sections.push('testimonials');
  if (/price|pricing|cost|plan|package/.test(txt)) sections.push('pricing-table');
  if (/contact|reach|call|email|form/.test(txt)) sections.push('contact-form');
  if (/team|staff|about|crew/.test(txt)) sections.push('team');
  if (/stat|number|count|track/.test(txt)) sections.push('stats');
  if (/faq|question|answer/.test(txt)) sections.push('faq');
  if (!sections.includes('cta')) sections.push('cta');
  return sections;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const input = ((body.input || body.prompt || '') as string).trim();
    if (!input) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    const actionType = detectIntent(input);
    const thinking: string[] = [];

    // ------------------------------------------------------------------
    // CREATE_ESTIMATE
    // ------------------------------------------------------------------
    if (actionType === 'CREATE_ESTIMATE') {
      thinking.push('Analyzing your project request…');
      const sqft = parseSqft(input);
      const template = pickTemplate(input);
      thinking.push(`Matched template: ${template.name} (${sqft.toLocaleString()} sqft)`);
      thinking.push('Calculating materials and labor costs…');

      const estimateInput = buildFromTemplate(template.id, sqft);
      const breakdown = engine.calculateEstimate(estimateInput);
      thinking.push(`Total estimate: $${breakdown.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

      let text: string;
      try {
        text = await llm(
          `Briefly summarize this construction estimate in 2-3 sentences for a contractor: ${template.name}, ${sqft} sqft, total $${breakdown.total.toFixed(0)}. Materials: $${breakdown.materialsTotal.toFixed(0)}, Labor: $${breakdown.laborTotal.toFixed(0)}.`,
          'estimate'
        );
      } catch {
        text = `Here's your ${template.name} estimate for ${sqft.toLocaleString()} sqft. Total: $${breakdown.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} (materials $${breakdown.materialsTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} + labor $${breakdown.laborTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}).`;
      }

      const result: CopilotResult = {
        text,
        thinking,
        action: {
          type: 'CREATE_ESTIMATE',
          payload: {
            templateId: template.id,
            templateName: template.name,
            sqft,
            breakdown: {
              materialsTotal: breakdown.materialsTotal,
              laborTotal: breakdown.laborTotal,
              subtotal: breakdown.subtotal,
              overheadAmount: breakdown.overheadAmount,
              taxAmount: breakdown.taxAmount,
              profitAmount: breakdown.profitAmount,
              total: breakdown.total,
              materialItems: breakdown.details.materials,
              laborItems: breakdown.details.labor,
            },
          },
        },
      };
      return NextResponse.json(result);
    }

    // ------------------------------------------------------------------
    // CREATE_PAGE
    // ------------------------------------------------------------------
    if (actionType === 'CREATE_PAGE') {
      thinking.push('Understanding your page requirements…');
      const sectionTypes = pickSections(input);
      thinking.push(`Planning ${sectionTypes.length} sections: ${sectionTypes.join(', ')}`);
      thinking.push('Generating page structure with AI…');

      // Build sections with AI-enhanced titles/headlines where possible
      const sections = sectionTypes.map((type) => {
        const defaults = DEFAULT_SECTION_PROPS[type] ?? {};
        return createSection(type, defaults);
      });

      // Use LLM to suggest a page title and hero headline
      let pageTitle = 'My New Page';
      let heroHeadline = 'Welcome';
      try {
        const suggestion = await llm(
          `Given this request: "${input}", suggest a short page title (max 8 words) and a compelling hero headline (max 12 words). Respond as JSON: {"title":"...","headline":"..."}`,
          'builder'
        );
        const parsed = JSON.parse(suggestion.replace(/```json|```/g, '').trim()) as { title?: string; headline?: string };
        pageTitle = parsed.title || pageTitle;
        heroHeadline = parsed.headline || heroHeadline;
        // Apply headline to hero section
        const heroSection = sections.find((s) => s.type === 'hero');
        if (heroSection) {
          (heroSection.props as Record<string, unknown>).headline = heroHeadline;
        }
      } catch {
        // keep defaults
      }

      thinking.push(`Created page: "${pageTitle}" with ${sections.length} sections`);

      let text: string;
      try {
        text = await llm(
          `Briefly describe this website page to the user in 2-3 sentences: title "${pageTitle}", sections: ${sectionTypes.join(', ')}. The user requested: "${input}".`,
          'builder'
        );
      } catch {
        text = `I've built "${pageTitle}" with ${sections.length} sections: ${sectionTypes.join(', ')}. Click "Open in Builder" below to customize and preview it.`;
      }

      const result: CopilotResult = {
        text,
        thinking,
        action: {
          type: 'CREATE_PAGE',
          payload: {
            pageTitle,
            sections,
            sectionCount: sections.length,
          },
        },
      };
      return NextResponse.json(result);
    }

    // ------------------------------------------------------------------
    // CREATE_AUTOMATION
    // ------------------------------------------------------------------
    if (actionType === 'CREATE_AUTOMATION') {
      thinking.push('Parsing automation requirements…');
      thinking.push('Generating workflow with AI…');

      const businessName = process.env.BUSINESS_NAME || 'TeamBuilderCopilot';
      let workflow = null;
      try {
        workflow = await generateWorkflowFromPrompt(input, businessName);
        thinking.push(`Workflow created: "${workflow.name}" with ${workflow.actions?.length ?? 0} actions`);
      } catch {
        thinking.push('Using template workflow as fallback…');
      }

      let text: string;
      try {
        text = await llm(
          `Describe this automation workflow briefly to a contractor: "${input}". Keep it under 3 sentences.`,
          'automation'
        );
      } catch {
        text = `I've designed an automation workflow for: "${input}". You can activate it from the Automations panel.`;
      }

      const result: CopilotResult = {
        text,
        thinking,
        action: {
          type: 'CREATE_AUTOMATION',
          payload: { workflow, description: input },
        },
      };
      return NextResponse.json(result);
    }

    // ------------------------------------------------------------------
    // NOOP — General chat
    // ------------------------------------------------------------------
    thinking.push('Processing your message…');
    let text: string;
    try {
      text = await llm(
        input,
        'chat',
        'You are TeamBuilderCopilot, an expert AI assistant for contractors and construction businesses. Be helpful, concise, and professional. You can help with estimates, website pages, automations, and general business advice.'
      );
    } catch {
      text = "I'm here to help! You can ask me to create an estimate, build a website page, or set up an automation workflow.";
    }
    thinking.push('Response ready');

    const result: CopilotResult = {
      text,
      thinking,
      action: { type: 'NOOP' },
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
