import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const memories = await prisma.memory.findMany();
  return NextResponse.json({ memories });
}

export async function POST(req: Request) {
  try {
    const { agent, message } = await req.json();
    if (!agent || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const record = await prisma.memory.create({ data: { agent, message } });
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}