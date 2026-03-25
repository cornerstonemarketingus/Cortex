import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  BOT_DEFINITIONS,
  buildRoleResponse,
  normalizeBotIds,
  sanitizePrompt,
} from '@/lib/chatBots';

export async function GET() {
  return NextResponse.json(BOT_DEFINITIONS);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { message?: unknown; botIds?: unknown } | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message : '';
    const prompt = sanitizePrompt(message);
    const botIds = normalizeBotIds(body.botIds);

    if (!prompt || botIds.length === 0) {
      return NextResponse.json({ error: "Missing 'message' or 'botIds' array" }, { status: 400 });
    }

    const results: { agent: string; result: string }[] = [];

    const ops = botIds.map((id) => {
      const bot = BOT_DEFINITIONS[id - 1];
      if (!bot) return null;

      const agent = bot.name;
      const resultText = buildRoleResponse(agent, prompt);
      results.push({ agent, result: resultText });

      if (prisma) {
        return prisma.memory.create({ data: { agent, message: resultText } });
      }
      return null;
    });

    if (prisma) {
      try {
        const validOps = ops.filter((op): op is NonNullable<typeof op> => op !== null);
        if (validOps.length > 0) {
          await prisma.$transaction(validOps);
        }
      } catch (dbError) {
        // Keep chat responsive even when DB migrations are not applied.
        console.warn('Skipping bot memory persistence:', dbError);
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('POST /api/bots error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}