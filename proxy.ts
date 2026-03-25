import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from '@/lib/adminAuth';
import { PRODUCT_ROUTE_PREFIX, resolveProductFromHost, resolveSiteFromHost } from '@/lib/subdomains';

const COMMON_SITE_PREFIXES = [
  '/admin',
  '/signup',
  '/subscription',
  '/launch',
  '/contact',
  '/pricing',
  '/product',
  '/resources',
  '/blog',
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

const CONTRACTOR_SITE_PREFIXES = [
  '/bid-build',
  '/bidbuilder',
  '/dashboard',
  '/leads',
  '/pipelines',
  '/automations',
  '/sites-funnels',
  '/payments',
  '/settings',
  '/estimates',
  '/construction-solutions',
  '/estimate',
  '/cost-calculator',
  '/aiboost',
  '/ai-automation-solutions',
  '/website-builder',
  '/app-builder',
  '/cortex',
];

const AUTOMATION_SITE_PREFIXES = [
  '/dashboard',
  '/leads',
  '/pipelines',
  '/automations',
  '/sites-funnels',
  '/payments',
  '/settings',
  '/estimates',
  '/bidbuilder',
  '/aiboost',
  '/ai-automation-solutions',
  '/website-builder',
  '/app-builder',
  '/cortex',
];

function isAuthorized(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return isValidAdminSessionToken(token);
}

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith('/builder') ||
    pathname.startsWith('/devboard') ||
    pathname.startsWith('/admin/portal') ||
    pathname.startsWith('/api/agents') ||
    pathname.startsWith('/api/jobs') ||
    pathname.startsWith('/api/cto') ||
    pathname.startsWith('/api/assets') ||
    pathname.startsWith('/api/builder/apply') ||
    pathname.startsWith('/api/builder/quality-gate') ||
    pathname.startsWith('/api/health')
  );
}

function shouldBypassSubdomain(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  );
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isAllowedForSite(pathname: string, site: 'contractor' | 'automation'): boolean {
  if (pathname === '/') return true;

  if (COMMON_SITE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return true;
  }

  const allowed = site === 'contractor' ? CONTRACTOR_SITE_PREFIXES : AUTOMATION_SITE_PREFIXES;
  return allowed.some((prefix) => matchesPrefix(pathname, prefix));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';

  if (isProtectedPath(pathname) && !isAuthorized(request)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Admin login required. Sign in at /admin/login.' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!shouldBypassSubdomain(pathname)) {
    const site = resolveSiteFromHost(host);
    if (site) {
      if (pathname === '/') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/bidbuilder';
        return NextResponse.rewrite(rewriteUrl);
      }

      if (!isAllowedForSite(pathname, site)) {
        const siteUrl = request.nextUrl.clone();
        siteUrl.pathname = '/bidbuilder';
        siteUrl.search = '';
        return NextResponse.redirect(siteUrl);
      }
    }

    const product = resolveProductFromHost(host);

    if (product) {
      const prefix = PRODUCT_ROUTE_PREFIX[product];
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = pathname === '/' ? prefix : `${prefix}${pathname}`;
        return NextResponse.rewrite(rewriteUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
