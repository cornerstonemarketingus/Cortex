import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from '@/src/crm/core/api';
import { getSubscriptionSnapshot } from '@/src/billing/subscription.service';
import { parseOptionalString } from '@/src/crm/core/http';
import { resolveEntitlements } from '@/src/billing/entitlements';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || '';
    const tenantId =
      parseOptionalString(request.nextUrl.searchParams.get('tenantId')) ||
      parseOptionalString(request.headers.get('x-tenant-id') || undefined) ||
      'cortex-default';
    if (!email) {
      throw new ApiError(400, 'email query param is required', 'EMAIL_REQUIRED');
    }

    const snapshot = await getSubscriptionSnapshot(email);
    const entitlements = await resolveEntitlements(email, tenantId);
    return NextResponse.json({
      ...snapshot,
      entitlements,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
