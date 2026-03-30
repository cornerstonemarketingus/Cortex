// LLM-based intent classification with structured output
import { callLLM } from '@/lib/llm';

export type Intent = 'estimate' | 'builder' | 'automation' | 'chat';

export interface ClassificationResult {
  intent: Intent;
  confidence: number;
  entities: {
    projectType?: string;
    sqft?: number;
    description?: string;
    features?: string[];
    action?: string;
  };
  rawText: string;
}

const SYSTEM_PROMPT = `You are an intent classification engine for a construction/service business automation platform.

Classify the user's request into exactly one of these intents:
- "estimate" → User wants a cost estimate/quote
- "builder" → User wants to create/edit a website
- "automation" → User wants to set up workflows/automations
- "chat" → User wants general assistance/discussion

Also extract structured data from the request if possible.

CRITICAL: Return valid JSON only, no other text.

{
  "intent": "estimate" | "builder" | "automation" | "chat",
  "confidence": 0.0-1.0,
  "entities": {
    "projectType": "roof" | "cleaning" | "renovation" | "commercial" | null,
    "sqft": number or null,
    "description": "brief summary",
    "features": ["array", "of", "features"],
    "action": "specific action requested"
  }
}`;

export async function classifyIntent(input: string): Promise<ClassificationResult> {
  try {
    const response = await callLLM({
      system: SYSTEM_PROMPT,
      user: input,
      temperature: 0,
      json: true,
    });

    const parsed = response.parsed || {
      intent: 'chat',
      confidence: 0.5,
      entities: {},
    };

    return {
      intent: (parsed.intent || 'chat') as Intent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      entities: parsed.entities || {},
      rawText: input,
    };
  } catch (error) {
    console.error('Intent classification failed:', error);
    return {
      intent: 'chat',
      confidence: 0,
      entities: {},
      rawText: input,
    };
  }
}

export default { classifyIntent };
