import { ApiError } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { createTakeoffEstimate, getProjectCategoryOptions, type UploadedPlanFile } from '@/src/estimating/ai-takeoff';
import { NextRequest } from 'next/server';
import {
  consumeEstimateReaderCredits,
  estimateReaderUsageUnits,
} from '@/src/billing/subscription.service';

export const runtime = 'nodejs';

type JsonBody = {
  files?: Array<{ name?: unknown; type?: unknown; size?: unknown }>;
  description?: unknown;
  projectCategory?: unknown;
  zipCode?: unknown;
  subscriberEmail?: unknown;
};

function normalizeFileMetadata(value: unknown): UploadedPlanFile[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as { name?: unknown; type?: unknown; size?: unknown };
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
      const size = Number(candidate.size);
      if (!name) return null;

      return {
        name,
        type: type || 'application/octet-stream',
        size: Number.isFinite(size) ? Math.max(0, Math.floor(size)) : 0,
      } satisfies UploadedPlanFile;
    })
    .filter((item): item is UploadedPlanFile => item !== null)
    .slice(0, 20);
}

async function parseInput(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File)
      .map((file) => ({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      }))
      .slice(0, 20);

    return {
      files,
      description: parseOptionalString(formData.get('description')),
      projectCategory: parseOptionalString(formData.get('projectCategory')),
      zipCode: parseOptionalString(formData.get('zipCode')),
      subscriberEmail: parseOptionalString(formData.get('subscriberEmail')),
    };
  }

  const body = (await request.json().catch(() => null)) as JsonBody | null;
  if (!body) {
    throw new ApiError(400, 'Invalid JSON body', 'INVALID_JSON');
  }

  return {
    files: normalizeFileMetadata(body.files),
    description: parseOptionalString(body.description),
    projectCategory: parseOptionalString(body.projectCategory),
    zipCode: parseOptionalString(body.zipCode),
    subscriberEmail: parseOptionalString(body.subscriberEmail),
  };
}

export async function GET() {
  return withApiHandler(async () => {
    return jsonResponse({
      acceptedFileTypes: ['PNG', 'JPG', 'WEBP', 'PDF'],
      categories: getProjectCategoryOptions(),
      engine: {
        version: 'estimator-v1.3',
        strategy: 'category + geometry + regional + complexity + risk ensemble',
      },
      notes: 'Upload plans or send file metadata and run AI takeoff to get an itemized estimate (active paid subscription + subscriberEmail required).',
    });
  });
}

export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const input = await parseInput(request);

    if (!input.subscriberEmail) {
      throw new ApiError(
        400,
        'subscriberEmail is required for estimate reader billing and usage metering.',
        'SUBSCRIBER_EMAIL_REQUIRED'
      );
    }

    if (input.files.length === 0 && !input.description) {
      throw new ApiError(
        400,
        'Upload at least one plan file or provide a project description.',
        'TAKEOFF_INPUT_REQUIRED'
      );
    }

    const usageUnits = estimateReaderUsageUnits({
      fileCount: input.files.length,
      descriptionLength: input.description?.length || 0,
    });

    const usage = await consumeEstimateReaderCredits({
      email: input.subscriberEmail,
      units: usageUnits,
      context: {
        projectCategory: input.projectCategory,
        zipCode: input.zipCode,
        fileCount: input.files.length,
      },
    });

    const estimate = createTakeoffEstimate(input);

    return jsonResponse(
      {
        estimate,
        categories: getProjectCategoryOptions(),
        usage,
      },
      201
    );
  });
}
