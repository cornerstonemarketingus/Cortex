export const SUBSCRIPTION_COOKIE = 'cortex_subscription';

export const SUBSCRIPTION_TIERS = ['unified', 'starter', 'growth', 'pro'] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export function parseSubscriptionTier(value?: string | null): SubscriptionTier | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return (SUBSCRIPTION_TIERS as readonly string[]).includes(normalized)
    ? (normalized as SubscriptionTier)
    : null;
}

export function hasEstimateReaderAccess(tier?: string | null): boolean {
  return parseSubscriptionTier(tier) !== null;
}

function shouldUseSecureSubscriptionCookie(request?: Request) {
  const override = process.env.CORTEX_SUBSCRIPTION_COOKIE_SECURE;
  if (override === 'true') return true;
  if (override === 'false') return false;

  if (!request) {
    return process.env.NODE_ENV === 'production';
  }

  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isHttps = requestUrl.protocol === 'https:' || forwardedProto === 'https';
  const isLocalHost = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';

  if (!isHttps && isLocalHost) {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

export function getSubscriptionCookieOptions(request?: Request) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: shouldUseSecureSubscriptionCookie(request),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}
