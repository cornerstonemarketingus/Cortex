import { NextResponse } from 'next/server';
import type { AppAction } from '@/lib/copilot/appModel';

type Body = { message?: string; pageId?: string };

function parseCommand(message: string, pageId: string): AppAction | null {
  const msg = message.toLowerCase();

  if (msg.includes('add testimonials')) {
    return {
      type: 'add_section',
      pageId,
      sectionType: 'testimonials',
      title: 'What Clients Say',
      content: 'Add 3 contractor reviews focused on trust, speed, and quality outcomes.',
    };
  }

  if (msg.includes('add services')) {
    return {
      type: 'add_section',
      pageId,
      sectionType: 'services',
      title: 'Services',
      content: 'Service cards with quote CTA and local market trust indicators.',
    };
  }

  if (msg.includes('add lead')) {
    return {
      type: 'add_lead',
      name: 'Generated Lead',
      service: 'General estimate',
      value: 8500,
    };
  }

  if (msg.includes('demo project') || msg.includes('create demo')) {
    return {
      type: 'create_demo_project',
      title: 'AI Generated Demo Project',
      estimate: 9800,
      margin: 0.33,
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const message = (body.message || '').trim();
    const pageId = (body.pageId || 'home').trim();

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const action = parseCommand(message, pageId);

    if (!action) {
      return NextResponse.json({
        action: null,
        guidance: 'Command not auto-mapped yet. Try: "Add testimonials section" or "Add lead".',
      });
    }

    return NextResponse.json({ action });
  } catch {
    return NextResponse.json({ error: 'Unable to parse command.' }, { status: 500 });
  }
}
