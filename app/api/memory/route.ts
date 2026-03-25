import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  const memories = await prisma.memory.findMany();
  return NextResponse.json({ memories });
}

export async function POST(req: Request) {
  if (!prisma) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  try {
    const { agent, message } = await req.json();
    if (!agent || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const record = await prisma.memory.create({ data: { agent, message } });
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}