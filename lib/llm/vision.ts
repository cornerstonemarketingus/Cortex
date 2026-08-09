/**
 * Plan vision analysis — sends an uploaded plan/blueprint image to a
 * vision-capable Claude model and asks it to identify a scope summary and
 * a rough quantity takeoff (item / quantity / unit) directly from the
 * drawing. Used by the AI Plan Takeoff feature to derive real line items
 * from the actual plan content instead of only file names.
 *
 * Degrades gracefully: returns null whenever no API key is configured or
 * the call fails, so callers can always fall back to the deterministic
 * takeoff engine.
 */

const VISION_TIMEOUT_MS = Number(process.env.LLM_HTTP_TIMEOUT_MS || 25_000);
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type PlanVisionLineItem = {
  item: string;
  quantity: number;
  unit: string;
};

export type PlanVisionAnalysis = {
  scopeSummary: string;
  detectedCategory?: string;
  lineItems: PlanVisionLineItem[];
};

export function isVisionAnalyzableImage(mimeType: string, size: number): boolean {
  return SUPPORTED_IMAGE_TYPES.has(mimeType.toLowerCase()) && size > 0 && size <= MAX_IMAGE_BYTES;
}

const SYSTEM_PROMPT = `You are a professional construction takeoff estimator reviewing an uploaded floor plan, blueprint, sketch, or job-site photo. \
Identify what is shown and produce a quantity takeoff grounded only in what is visible or clearly inferable. \
Respond with ONLY a single JSON object, no markdown fences, no commentary, matching this shape exactly:
{"scopeSummary": string, "detectedCategory": string | null, "lineItems": [{"item": string, "quantity": number, "unit": string}]}
Rules:
- "detectedCategory" must be one of: deck, bathroom-remodel, kitchen-gut, roof-replacement, basement-finish, general-construction, or null if unclear.
- "lineItems" should list 3-12 measurable takeoff items (areas in sq ft, lengths in linear ft, counts in "ea") with realistic quantities based on the drawing's scale, dimensions, and labels.
- If dimensions aren't labeled, provide a reasonable visual estimate and say so in scopeSummary.
- Never include prices — quantities and units only.`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

function parseAnalysis(raw: string): PlanVisionAnalysis | null {
  try {
    const parsed = JSON.parse(extractJson(raw)) as {
      scopeSummary?: unknown;
      detectedCategory?: unknown;
      lineItems?: unknown;
    };

    const scopeSummary = typeof parsed.scopeSummary === 'string' ? parsed.scopeSummary.trim() : '';
    if (!scopeSummary) return null;

    const detectedCategory =
      typeof parsed.detectedCategory === 'string' && parsed.detectedCategory.trim()
        ? parsed.detectedCategory.trim()
        : undefined;

    const lineItems: PlanVisionLineItem[] = Array.isArray(parsed.lineItems)
      ? parsed.lineItems
          .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const candidate = entry as { item?: unknown; quantity?: unknown; unit?: unknown };
            const item = typeof candidate.item === 'string' ? candidate.item.trim() : '';
            const quantity = Number(candidate.quantity);
            const unit = typeof candidate.unit === 'string' ? candidate.unit.trim() : '';
            if (!item || !unit || !Number.isFinite(quantity) || quantity <= 0) return null;
            return { item, quantity, unit };
          })
          .filter((entry): entry is PlanVisionLineItem => entry !== null)
          .slice(0, 12)
      : [];

    return { scopeSummary, detectedCategory, lineItems };
  } catch {
    return null;
  }
}

/**
 * Analyze a single plan image (already base64-encoded) with Claude vision.
 * Returns null on missing API key, unsupported type, or any failure.
 */
export async function analyzePlanImage(params: {
  base64: string;
  mediaType: string;
  fileName: string;
}): Promise<PlanVisionAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_VISION_MODEL || 'claude-3-5-sonnet-20241022';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1400,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: params.mediaType,
                  data: params.base64,
                },
              },
              {
                type: 'text',
                text: `File name: ${params.fileName}. Analyze this construction plan and return the JSON takeoff described in your instructions.`,
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.[0]?.text;
    if (!text) return null;

    return parseAnalysis(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Analyze multiple plan images in parallel (bounded by caller) and return
 * only the analyses that succeeded.
 */
export async function analyzePlanImages(
  images: Array<{ base64: string; mediaType: string; fileName: string }>
): Promise<PlanVisionAnalysis[]> {
  if (images.length === 0) return [];

  const results = await Promise.all(images.map((image) => analyzePlanImage(image)));
  return results.filter((result): result is PlanVisionAnalysis => result !== null);
}
