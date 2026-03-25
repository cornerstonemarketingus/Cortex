import { NextResponse } from 'next/server';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, 'Invalid JSON body', 'INVALID_JSON');
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(500, error.message, 'INTERNAL_ERROR');
  }

  return new ApiError(500, 'Unknown server error', 'INTERNAL_ERROR');
}

export function apiErrorResponse(error: unknown) {
  const apiError = toApiError(error);
  return NextResponse.json(
    {
      error: apiError.message,
      code: apiError.code,
      details: apiError.details,
    },
    { status: apiError.status }
  );
}
