import { NextRequest, NextResponse } from 'next/server';
import { PRESET_WORKFLOWS, generateWorkflowFromPrompt, type Workflow } from '@/lib/automation/engine';

/** GET /api/automations/workflows — list all workflows */
export async function GET() {
  return NextResponse.json({ workflows: PRESET_WORKFLOWS });
}

/** POST /api/automations/workflows — create workflow from prompt or raw definition */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, businessName, workflow } = body as {
      prompt?: string;
      businessName?: string;
      workflow?: Workflow;
    };

    if (workflow) {
      // Save raw workflow definition — in production, persist to DB
      return NextResponse.json({ workflow, saved: true });
    }

    if (prompt) {
      const generated = await generateWorkflowFromPrompt(
        prompt,
        businessName ?? process.env.BUSINESS_NAME ?? 'Cortex'
      );
      return NextResponse.json({ workflow: generated, saved: false });
    }

    return NextResponse.json({ error: 'prompt or workflow required' }, { status: 400 });
  } catch (err) {
    console.error('[/api/automations/workflows POST]', err);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }
}
