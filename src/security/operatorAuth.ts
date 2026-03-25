import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from '@/lib/adminAuth';
import { ApiError } from '@/src/crm/core/api';
import { getBearerToken, verifyCrmToken } from '@/src/crm/core/auth';

function getCookieValue(cookieHeader: string, key: string): string | undefined {
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [nameRaw, ...valueParts] = part.trim().split('=');
    if (!nameRaw || valueParts.length === 0) continue;

    if (nameRaw === key) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return undefined;
}

export async function requireOperatorAccess(
  request: Request,
  options?: {
    adminOnly?: boolean;
  }
) {
  const token = getBearerToken(request);
  if (token) {
    const claims = await verifyCrmToken(token);
    if (options?.adminOnly && claims.role !== 'admin') {
      throw new ApiError(403, 'Admin role required for this action', 'FORBIDDEN');
    }
    return {
      source: 'crm-token' as const,
      role: claims.role,
      sub: claims.sub,
    };
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const sessionToken = getCookieValue(cookieHeader, ADMIN_SESSION_COOKIE);
  if (isValidAdminSessionToken(sessionToken)) {
    return {
      source: 'admin-session' as const,
      role: 'admin' as const,
      sub: 'admin-session',
    };
  }

  throw new ApiError(401, 'Operator authentication required', 'OPERATOR_AUTH_REQUIRED');
}
