import { NextResponse } from 'next/server';
import { TOKEN_PLANS } from '@/lib/communications/core';

export async function GET() {
  return NextResponse.json({ plans: TOKEN_PLANS });
}
