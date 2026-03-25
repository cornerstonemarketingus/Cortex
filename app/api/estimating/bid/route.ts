import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { createBidEstimate, EXAMPLE_BID_PROMPTS, getProjectCategoryOptions } from '@/src/estimating/ai-takeoff';

export const runtime = 'nodejs';

type BidBody = {
  description?: unknown;
  projectCategory?: unknown;
  zipCode?: unknown;
};

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      examples: EXAMPLE_BID_PROMPTS,
      categories: getProjectCategoryOptions(),
      engine: {
        version: 'estimator-v1.3',
        strategy: 'category + geometry + regional + complexity + risk ensemble',
      },
    });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<BidBody>(request);
    const description = parseOptionalString(body.description);

    if (!description) {
      throw new ApiError(400, 'Job description is required.', 'BID_DESCRIPTION_REQUIRED');
    }

    const estimate = createBidEstimate({
      description,
      projectCategory: parseOptionalString(body.projectCategory),
      zipCode: parseOptionalString(body.zipCode),
    });

    return jsonResponse(
      {
        estimate,
      },
      201
    );
  });
}
