import { NextResponse } from 'next/server';
import { llm } from '@/lib/llm/router';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const input = ((body.input || body.prompt || '') as string).trim();
    const appType = (body.appType as string | undefined) ?? 'landing-page';

    if (!input) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // ── Landing page generation ────────────────────────────────────────────
    if (appType === 'landing-page') {
      const sectionPrompt = `
You are an expert React/Next.js developer and web designer.

Generate a complete, production-ready landing page React component for this business:
"${input}"

Requirements:
- Use Tailwind CSS classes only (no custom CSS)
- Include: Hero, Services (3 items), Why Choose Us (3 points), Testimonials (2), CTA
- Modern dark theme with professional typography
- Fully responsive mobile-first
- Placeholder text should be realistic for the business type described
- Export as: export default function GeneratedPage()
- NO imports needed (assume Tailwind is available)
- Include realistic business name, tagline, and copy

Return ONLY the React component code, nothing else.
      `.trim();

      const code = await llm(sectionPrompt, 'code', 'Return only valid React JSX code. No markdown, no explanation.');

      return NextResponse.json({
        appType: 'landing-page',
        input,
        code,
        preview: {
          title: extractTitle(input),
          description: `Landing page for: ${input}`,
        },
      });
    }

    // ── CRM / Dashboard generation ─────────────────────────────────────────
    if (appType === 'crm' || appType === 'dashboard') {
      const crmPrompt = `
You are an expert React/Next.js developer.

Generate a complete contractor CRM dashboard React component for: "${input}"

Requirements:
- Use Tailwind CSS classes only
- Include these sections:
  1. Stats row: Total leads, Active jobs, Revenue this month, Closed deals
  2. Leads table: Name, Phone, Status (New/Contacted/Quoted/Won/Lost), Date
  3. Add lead form (Name, Phone, Email, Trade, Notes)
  4. Quick actions sidebar
- Dark theme (#0b0d12 background)
- Use useState for local state (no external deps)
- Use realistic contractor-specific data for placeholders
- Export as: export default function ContractorCRM()

Return ONLY the React component code.
      `.trim();

      const code = await llm(crmPrompt, 'code', 'Return only valid React JSX code.');

      return NextResponse.json({
        appType: 'crm',
        input,
        code,
        preview: {
          title: 'Contractor CRM Dashboard',
          description: `CRM dashboard for: ${input}`,
        },
      });
    }

    // ── Generic app generation ─────────────────────────────────────────────
    const genericPrompt = `
You are an expert React/Next.js developer.

Generate a complete, working React component for this request:
"${input}"

Requirements:
- Tailwind CSS only
- Dark theme
- Realistic, business-appropriate content
- Functional (uses useState where needed)
- Professional modern UI

Return ONLY the React component code with a default export.
    `.trim();

    const code = await llm(genericPrompt, 'code', 'Return only valid React JSX code.');

    return NextResponse.json({
      appType: 'generic',
      input,
      code,
      preview: {
        title: extractTitle(input),
        description: input,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'App generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractTitle(input: string): string {
  const words = input.split(' ').slice(0, 6).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
