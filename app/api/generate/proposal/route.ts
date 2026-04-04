import { NextResponse } from 'next/server';
import { llm } from '@/lib/llm/router';

export interface ProposalTrade {
  tradeName: string;
  sqft: number;
  breakdown: {
    materialsTotal: number;
    laborTotal: number;
    subtotal: number;
    overheadAmount: number;
    taxAmount: number;
    profitAmount: number;
    total: number;
  };
}

export interface ProposalInput {
  clientName?: string;
  projectAddress?: string;
  contractorName?: string;
  trades: ProposalTrade[];
  grandTotal: number;
  timeline?: { tradeName: string; startDay: number; durationDays: number }[];
  notes?: string;
}

const TERMS = `
1. This proposal is valid for 30 days from the date of issue.
2. A 50% deposit is required to commence work. Remaining balance due upon completion.
3. Change orders must be submitted in writing and may affect timeline and cost.
4. Contractor is not responsible for delays caused by weather, permit approval, or owner-initiated changes.
5. All materials remain the property of the contractor until payment is made in full.
6. This proposal does not include permit fees unless explicitly stated.
`.trim();

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as Partial<ProposalInput>;
    const {
      clientName = 'Valued Client',
      projectAddress = 'TBD',
      contractorName = process.env.BUSINESS_NAME || 'TeamBuilderCopilot',
      trades = [],
      grandTotal = 0,
      timeline = [],
      notes = '',
    } = body;

    if (!trades.length) {
      return NextResponse.json({ error: 'No trade data provided.' }, { status: 400 });
    }

    // AI-generated project overview and scope paragraphs
    let projectOverview = '';
    let scopeParagraphs: Record<string, string> = {};

    try {
      projectOverview = await llm(
        `Write a 2-sentence professional project overview for a construction proposal. Client: ${clientName}. Project address: ${projectAddress}. Contractor: ${contractorName}. Trades: ${trades.map((t) => t.tradeName).join(', ')}. Total value: ${fmt(grandTotal)}.`,
        'estimate',
        'You are a professional construction proposal writer. Be concise and formal.'
      );
    } catch {
      projectOverview = `This proposal outlines the scope, cost, and schedule for construction services at ${projectAddress}. Work will be performed by ${contractorName} to the highest professional standards.`;
    }

    try {
      const scopePrompt = `Write a brief 1-2 sentence scope description for each of these construction trades: ${trades.map((t) => t.tradeName).join(', ')}. Return as JSON object where keys are exact trade names and values are scope descriptions.`;
      const raw = await llm(scopePrompt, 'estimate', 'Return only valid JSON.');
      scopeParagraphs = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Record<string, string>;
    } catch {
      for (const t of trades) {
        scopeParagraphs[t.tradeName] = `Professional ${t.tradeName.toLowerCase()} services including all labor and materials.`;
      }
    }

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Build proposal sections
    const proposal = {
      meta: {
        proposalDate: today,
        clientName,
        projectAddress,
        contractorName,
        validUntil: new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      },
      sections: [
        {
          id: 'overview',
          title: 'Project Overview',
          content: projectOverview,
        },
        {
          id: 'scope',
          title: 'Scope of Work',
          trades: trades.map((t) => ({
            name: t.tradeName,
            sqft: t.sqft,
            scope: scopeParagraphs[t.tradeName] ?? `${t.tradeName} work as specified.`,
          })),
        },
        {
          id: 'estimate',
          title: 'Itemized Estimate',
          trades: trades.map((t) => ({
            name: t.tradeName,
            materials: fmt(t.breakdown.materialsTotal),
            labor: fmt(t.breakdown.laborTotal),
            overhead: fmt(t.breakdown.overheadAmount),
            tax: fmt(t.breakdown.taxAmount),
            profit: fmt(t.breakdown.profitAmount),
            subtotal: fmt(t.breakdown.total),
          })),
          grandTotal: fmt(grandTotal),
        },
        {
          id: 'timeline',
          title: 'Project Timeline',
          phases: timeline.length > 0 ? timeline : trades.map((t, i) => ({
            tradeName: t.tradeName,
            startDay: i * 5 + 1,
            durationDays: Math.max(3, Math.round(t.sqft / 200)),
          })),
        },
        {
          id: 'notes',
          title: 'Project Notes',
          content: notes || 'No additional notes.',
        },
        {
          id: 'terms',
          title: 'Terms & Conditions',
          content: TERMS,
        },
      ],
    };

    return NextResponse.json({ proposal });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proposal generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
