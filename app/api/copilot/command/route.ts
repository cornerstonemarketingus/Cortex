import { NextResponse } from 'next/server';
import { parseCommandToActions, type CopilotContext } from '@/lib/copilot/actionEngine';

type Body = { message?: string; context?: CopilotContext };

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const message = (body.message || '').trim();
    const context = body.context || { currentPage: 'home' };

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const command = parseCommandToActions(message, context);
    return NextResponse.json(command);
  } catch {
    return NextResponse.json({ error: 'Unable to parse command.' }, { status: 500 });
  }
}
