import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from '@/src/crm/core/api';
import { createSubscriptionCheckoutSession } from '@/src/billing/subscription.service';

type CheckoutBody = {
  email?: unknown;
  tier?: unknown;
  successUrl?: unknown;
  cancelUrl?: unknown;
};

function parseOptionalString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as CheckoutBody | null;
    if (!body) {
      throw new ApiError(400, 'Invalid JSON body', 'INVALID_JSON');
    }

    const email = parseOptionalString(body.email);
    const tier = parseOptionalString(body.tier);

    if (!email) {
      throw new ApiError(400, 'email is required', 'EMAIL_REQUIRED');
    }

    const origin = new URL(request.url).origin;
    const successUrl =
      parseOptionalString(body.successUrl) ||
      `${origin}/signup?success=1&email=${encodeURIComponent(email)}`;
    const cancelUrl = parseOptionalString(body.cancelUrl) || `${origin}/signup?canceled=1`;

    const session = await createSubscriptionCheckoutSession({
      email,
      tier,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({ checkout: session }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
