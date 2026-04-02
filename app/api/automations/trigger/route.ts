import { NextRequest, NextResponse } from 'next/server';
import { fireTrigger, generateWorkflowFromPrompt, PRESET_WORKFLOWS, type TriggerEvent, type Workflow, type WorkflowContext } from '@/lib/automation/engine';

/** POST /api/automations/trigger — fire a named trigger event */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trigger, context, workflowIds } = body as {
      trigger: TriggerEvent;
      context: WorkflowContext;
      workflowIds?: string[];
    };

    if (!trigger) {
      return NextResponse.json({ error: 'trigger required' }, { status: 400 });
    }

    // Load workflows — in production this would come from database
    // For now use presets + any passed workflows
    const workflows: Workflow[] = [...PRESET_WORKFLOWS];

    const results = await fireTrigger(trigger, workflows, context ?? {});

    return NextResponse.json({
      triggered: results.length,
      results: results.map((r) => ({
        workflowId: r.workflowId,
        trigger: r.trigger,
        success: r.success,
        actionsExecuted: r.results.length,
        errors: r.results.filter((a) => !a.success).map((a) => a.error),
      })),
    });
  } catch (err) {
    console.error('[/api/automations/trigger]', err);
    return NextResponse.json({ error: 'Failed to fire trigger' }, { status: 500 });
  }
}
