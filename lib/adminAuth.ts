export const ADMIN_SESSION_COOKIE = 'cortex_admin_session';

const DEFAULT_ADMIN_USER = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'devpass123';
const DEFAULT_SESSION_TOKEN = 'cortex-admin-dev-session';

export function getAdminUser() {
  return process.env.CORTEX_ADMIN_USER || DEFAULT_ADMIN_USER;
}

export function getAdminPassword() {
  return process.env.CORTEX_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

export function getAdminSessionToken() {
  return process.env.CORTEX_ADMIN_SESSION_TOKEN || DEFAULT_SESSION_TOKEN;
}

export function isValidAdminCredentials(username: string, password: string) {
  return username === getAdminUser() && password === getAdminPassword();
}

export function isValidAdminSessionToken(token?: string | null) {
  return !!token && token === getAdminSessionToken();
}

function shouldUseSecureAdminCookie(request?: Request) {
  const override = process.env.CORTEX_ADMIN_COOKIE_SECURE;
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

export function getAdminSessionCookieOptions(request?: Request) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: shouldUseSecureAdminCookie(request),
    path: '/',
    maxAge: 60 * 60 * 8,
  };
}
