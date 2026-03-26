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

  if (msg.includes('add crm field')) {
    return {
      type: 'add_crm_field',
      key: 'projectStatus',
      label: 'Project Status',
      fieldType: 'select',
    };
  }

  if (msg.includes('remove crm field')) {
    return {
      type: 'remove_crm_field',
      key: 'projectStatus',
    };
  }

  if (msg.includes('create automation') || msg.includes('add automation')) {
    return {
      type: 'create_automation',
      name: 'Weekly Estimate Follow-up',
      trigger: 'weekly_scheduler',
      action: 'send_estimate_nurture_sequence',
    };
  }

  if (msg.includes('estimate settings') || msg.includes('update margin')) {
    return {
      type: 'update_estimate_settings',
      defaultMargin: 0.35,
      laborRate: 60,
      taxRate: 0.08,
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
        guidance: 'Command not auto-mapped yet. Try: "Add testimonials section", "Add CRM field", "Create automation", or "Update estimate settings".',
      });
    }

    return NextResponse.json({ action });
  } catch {
    return NextResponse.json({ error: 'Unable to parse command.' }, { status: 500 });
  }
}
