export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

export function getCrmDatabaseUrl(): string {
  return getEnv(
    'CRM_DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/cortex_crm?schema=public'
  );
}

export function getCrmJwtSecret(): string {
  return getEnv('CRM_JWT_SECRET', 'change-me-crm-jwt-secret');
}

export function getOpenAiApiKey(): string | null {
  const value = process.env.OPENAI_API_KEY;
  if (!value || value.trim().length === 0) {
    return null;
  }
  return value;
}

export function getOpenAiModel(): string {
  return getEnv('CRM_OPENAI_MODEL', 'gpt-4.1-mini');
}

export function getCrmRateLimitRpm(): number {
  const raw = process.env.CRM_OPENAI_RATE_LIMIT_RPM;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 60;
}

export function getStripeSecretKey(): string | null {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value || value.trim().length === 0) {
    return null;
  }
  return value;
}
