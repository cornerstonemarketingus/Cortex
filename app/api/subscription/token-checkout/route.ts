import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from '@/src/crm/core/api';
import { createTokenPackCheckoutSession } from '@/src/billing/subscription.service';

type TokenCheckoutBody = {
  email?: unknown;
  packId?: unknown;
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
    const body = (await request.json().catch(() => null)) as TokenCheckoutBody | null;
    if (!body) {
      throw new ApiError(400, 'Invalid JSON body', 'INVALID_JSON');
    }

    const email = parseOptionalString(body.email);
    const packId = parseOptionalString(body.packId) || 'boost-500';

    if (!email) {
      throw new ApiError(400, 'email is required', 'EMAIL_REQUIRED');
    }

    const origin = new URL(request.url).origin;
    const successUrl = parseOptionalString(body.successUrl) || `${origin}/subscription?tokenSuccess=1&email=${encodeURIComponent(email)}`;
    const cancelUrl = parseOptionalString(body.cancelUrl) || `${origin}/subscription?tokenCanceled=1`;

    const session = await createTokenPackCheckoutSession({
      email,
      packId,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({ checkout: session }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
