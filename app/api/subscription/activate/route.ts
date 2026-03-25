import { NextResponse } from 'next/server';
import {
  getSubscriptionCookieOptions,
  parseSubscriptionTier,
  SUBSCRIPTION_COOKIE,
  type SubscriptionTier,
} from '@/lib/subscriptionAuth';

type ActivateBody = {
  email?: unknown;
  tier?: unknown;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseTier(value: unknown): SubscriptionTier {
  if (typeof value !== 'string') return 'unified';
  return parseSubscriptionTier(value) || 'unified';
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ActivateBody | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }

  const tier = parseTier(body.tier);

  const response = NextResponse.json({
    ok: true,
    tier,
  });

  response.cookies.set(SUBSCRIPTION_COOKIE, tier, getSubscriptionCookieOptions(request));

  return response;
}
