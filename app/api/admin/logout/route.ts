import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSessionCookieOptions } from '@/lib/adminAuth';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...getAdminSessionCookieOptions(request),
    maxAge: 0,
  });

  return response;
}
