import { NextResponse } from 'next/server';
import { parseCommandToActions, type CopilotContext, type CopilotMode } from '@/lib/copilot/actionEngine';

type Body = { message?: string; context?: CopilotContext; mode?: CopilotMode };

function inferModeFromMessage(message: string, requestedMode?: CopilotMode): CopilotMode {
  const msg = message.toLowerCase();
  if (msg.includes('let\'s plan') || msg.includes('talk through this') || msg.includes('don\'t build yet') || msg.includes('brainstorm')) {
    return 'DISCUSS';
  }
  if (msg.includes('go ahead') || msg.includes('build it')) {
    return 'EXECUTE';
  }
  return requestedMode || 'EXECUTE';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const message = (body.message || '').trim();
    const context = body.context || { currentPage: 'home' };
    const mode = inferModeFromMessage(message, body.mode);

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const command = parseCommandToActions(message, context, mode);

    if (mode === 'CONFIRM') {
      return NextResponse.json({
        ...command,
        preview: command.preview || {
          summary: `This will run ${command.actions.length || 1} action(s) in ${context.currentPage || 'workspace'}.`,
          impact: 'No existing records will be deleted. Changes will be applied only after approval.',
        },
        requires_confirmation: true,
        ui_feedback: {
          message: 'Confirm mode: review actions and approve to execute.',
          highlight: command.ui_feedback?.highlight || 'copilot',
        },
      });
    }

    return NextResponse.json(command);
  } catch {
    return NextResponse.json({ error: 'Unable to parse command.' }, { status: 500 });
  }
}
