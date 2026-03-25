import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  getAdminUser,
  isValidAdminSessionToken,
} from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = isValidAdminSessionToken(token);

  return NextResponse.json({
    authenticated,
    username: authenticated ? getAdminUser() : null,
  });
}
