import { NextResponse } from 'next/server';
import { applyAction, type AppAction, type AppModel } from '@/lib/copilot/appModel';
import { validateAction } from '@/lib/copilot/actionEngine';

type Body = {
  model?: AppModel;
  action?: AppAction;
  actions?: AppAction[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;

    if (!body.model || (!body.action && !body.actions?.length)) {
      return NextResponse.json({ error: 'model and action(s) are required' }, { status: 400 });
    }

    const actions = body.actions?.length ? body.actions : body.action ? [body.action] : [];
    let nextModel = body.model;

    for (const action of actions) {
      const validationError = validateAction(action);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      nextModel = applyAction(nextModel, action);
    }

    return NextResponse.json({ model: nextModel });
  } catch {
    return NextResponse.json({ error: 'Unable to execute action.' }, { status: 500 });
  }
}
