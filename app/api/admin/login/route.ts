import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
  getAdminSessionToken,
  getAdminUser,
  isValidAdminCredentials,
} from '@/lib/adminAuth';

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  const password = body.password || '';

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  if (!isValidAdminCredentials(username, password)) {
    return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    username: getAdminUser(),
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, getAdminSessionToken(), getAdminSessionCookieOptions(request));

  return response;
}
