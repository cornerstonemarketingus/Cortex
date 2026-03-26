import { NextResponse } from 'next/server';
import { applyAction, type AppAction, type AppModel } from '@/lib/copilot/appModel';

type Body = {
  model?: AppModel;
  action?: AppAction;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;

    if (!body.model || !body.action) {
      return NextResponse.json({ error: 'model and action are required' }, { status: 400 });
    }

    const nextModel = applyAction(body.model, body.action);
    return NextResponse.json({ model: nextModel });
  } catch {
    return NextResponse.json({ error: 'Unable to execute action.' }, { status: 500 });
  }
}
