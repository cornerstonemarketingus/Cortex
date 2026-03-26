import { NextResponse } from 'next/server';
import { createWeeklySchedule, listSchedules, runDueSchedules } from '@/src/content/blog-scheduler';
import { BLOG_MONETIZATION_MODES, BLOG_REGIONS, BLOG_STYLES, type BlogMonetizationMode, type BlogRegion, type BlogStyle } from '@/src/content/blog-engine';

type Body = {
  operation?: 'create' | 'run-now';
  dayOfWeek?: number;
  hourUtc?: number;
  topicTemplate?: string;
  businessType?: string;
  audience?: string;
  region?: BlogRegion;
  style?: BlogStyle;
  monetizationMode?: BlogMonetizationMode;
  callToAction?: string;
};

function parseRegion(value: unknown): BlogRegion {
  if (typeof value === 'string' && BLOG_REGIONS.includes(value as BlogRegion)) {
    return value as BlogRegion;
  }
  return 'global';
}

function parseStyle(value: unknown): BlogStyle {
  if (typeof value === 'string' && BLOG_STYLES.includes(value as BlogStyle)) {
    return value as BlogStyle;
  }
  return 'conversion-brief';
}

function parseMonetization(value: unknown): BlogMonetizationMode {
  if (typeof value === 'string' && BLOG_MONETIZATION_MODES.includes(value as BlogMonetizationMode)) {
    return value as BlogMonetizationMode;
  }
  return 'hybrid';
}

export async function GET() {
  try {
    const schedules = await listSchedules();
    return NextResponse.json({ schedules });
  } catch {
    return NextResponse.json({ error: 'Unable to load scheduler.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;

    if (body.operation === 'run-now') {
      const results = await runDueSchedules();
      return NextResponse.json({ results });
    }

    const schedule = await createWeeklySchedule({
      dayOfWeek: Number.isFinite(Number(body.dayOfWeek)) ? Number(body.dayOfWeek) : 1,
      hourUtc: Number.isFinite(Number(body.hourUtc)) ? Number(body.hourUtc) : 14,
      topicTemplate: (body.topicTemplate || 'Weekly contractor growth playbook - {date}').trim(),
      businessType: (body.businessType || 'contractor').trim(),
      audience: (body.audience || 'homeowners and contractors').trim(),
      region: parseRegion(body.region),
      style: parseStyle(body.style),
      monetizationMode: parseMonetization(body.monetizationMode),
      callToAction: (body.callToAction || 'Book a Builder Copilot growth strategy session').trim(),
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to manage scheduler.' }, { status: 500 });
  }
}
