import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callOpenAiChat, AiMessage } from '@/src/crm/core/openai';

const ActionSchema = z.object({
  type: z.enum(['CREATE_ESTIMATE', 'CREATE_PAGE', 'CREATE_AUTOMATION', 'NOOP']),
  payload: z.any().optional(),
});

const CopilotResponseSchema = z.object({
  text: z.string(),
  action: ActionSchema,
});

function detectIntent(input: string) {
  const txt = input.toLowerCase();
  if (/estimate|quote|bid|sqft|square foot|square footage/.test(txt)) return 'CREATE_ESTIMATE';
  if (/page|website|landing|hero|headline/.test(txt)) return 'CREATE_PAGE';
  if (/automation|workflow|follow up|autopilot|sequence|trigger/.test(txt)) return 'CREATE_AUTOMATION';
  return 'NOOP';
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = (body.input || body.prompt || '') as string;

    if (!input || !input.trim()) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const systemPrompt = `You are an assistant that MUST respond ONLY with valid JSON matching the schema: { "text": string, "action": { "type": "CREATE_ESTIMATE|CREATE_PAGE|CREATE_AUTOMATION|NOOP", "payload": object|null } . Do not include any surrounding explanation or markdown. Respond only with the JSON object.`;

    const messages: AiMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input },
    ];

    try {
      const aiText = await callOpenAiChat(messages, 'friendly');

      // Attempt to parse AI response as JSON and validate with zod.
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(aiText);
      } catch (e) {
        // Fallback to simple intent detection
        const intentType = detectIntent(input);
        const fallback = { text: `Detected intent: ${intentType.toLowerCase()}`, action: { type: intentType, payload: { prompt: input } } };
        return NextResponse.json(fallback, { status: 200 });
      }

      const validated = CopilotResponseSchema.safeParse(parsedJson);
      if (!validated.success) {
        const intentType = detectIntent(input);
        const fallback = { text: `Detected intent: ${intentType.toLowerCase()}`, action: { type: intentType, payload: { prompt: input } } };
        return NextResponse.json(fallback, { status: 200 });
      }

      return NextResponse.json(validated.data, { status: 200 });
    } catch (aiErr) {
      // AI call failed — return a safe fallback intent
      const intentType = detectIntent(input);
      const fallback = { text: `Detected intent: ${intentType.toLowerCase()}`, action: { type: intentType, payload: { prompt: input } } };
      return NextResponse.json(fallback, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
