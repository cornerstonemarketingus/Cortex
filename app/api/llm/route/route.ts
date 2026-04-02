import { NextRequest, NextResponse } from 'next/server';
import { llm, routeLLM, type LLMTask } from '@/lib/llm/router';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, task, systemPrompt, messages } = body as {
      prompt?: string;
      task?: LLMTask;
      systemPrompt?: string;
      messages?: Array<{ role: string; content: string }>;
    };

    if (!prompt && !messages?.length) {
      return NextResponse.json({ error: 'prompt or messages required' }, { status: 400 });
    }

    if (messages?.length) {
      // Flatten chat history into a single prompt for the router
      const userMessages = messages.filter((m) => m.role !== 'system');
      const sysMsg = messages.find((m) => m.role === 'system');
      const flatPrompt = userMessages.map((m) => `${m.role}: ${m.content}`).join('\n');
      const result = await routeLLM({
        task: task ?? 'chat',
        prompt: flatPrompt,
        systemPrompt: sysMsg?.content ?? systemPrompt,
      });
      return NextResponse.json({ text: result.text, provider: result.provider, model: result.model });
    }

    const text = await llm(prompt!, task, systemPrompt);
    return NextResponse.json({ text });
  } catch (err) {
    console.error('[/api/llm/route]', err);
    return NextResponse.json({ error: 'LLM routing failed' }, { status: 500 });
  }
}
