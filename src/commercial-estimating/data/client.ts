/**
 * Prisma client for the commercial estimating schema.
 *
 * Mirrors the existing `src/crm/core/crmDb.ts` pattern: a lazily-created
 * singleton over the pg adapter, cached on globalThis in development so hot
 * reload does not exhaust the connection pool.
 *
 * Deliberately a *separate* client from the CRM's. The CRM holds live customer
 * sales data; construction estimating should not be able to reach it through a
 * shared client by accident.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/commercial-client';

export type CommercialDb = PrismaClient;

type CommercialGlobal = {
  commercialDb?: PrismaClient;
  commercialAdapter?: PrismaPg;
};

const globalForCommercial = global as unknown as CommercialGlobal;

export function getCommercialDatabaseUrl(): string | null {
  const url = process.env.COMMERCIAL_DATABASE_URL?.trim();
  return url ? url : null;
}

export type CommercialConnection = {
  connectionString: string;
  schema: string;
};

/**
 * Normalize the connection string for the pg driver adapter.
 *
 * A note on namespaces, because this is a real trap: `?schema=` is a Prisma
 * *CLI* convention. Prisma 7's driver-adapter runtime does not read it — the
 * query compiler resolves every table against `public` regardless — so a
 * connection string that asks for a custom schema will create tables the CLI
 * can see and the application cannot. Isolation from the CRM is therefore done
 * at the database level: point COMMERCIAL_DATABASE_URL at its own database.
 *
 * We strip the parameter and warn rather than letting it fail mysteriously at
 * the first query.
 */
export function parseCommercialConnection(rawUrl: string): CommercialConnection {
  try {
    const url = new URL(rawUrl);
    const requested = url.searchParams.get('schema')?.trim();
    url.searchParams.delete('schema');

    if (requested && requested !== 'public') {
      console.warn(
        `[commercial-estimating] COMMERCIAL_DATABASE_URL requests schema "${requested}", ` +
          'but the Prisma driver adapter always resolves tables in "public". ' +
          'Use a dedicated database for isolation instead; the parameter has been ignored.'
      );
    }

    return { connectionString: url.toString(), schema: 'public' };
  } catch {
    // Not a parseable URL — hand it to pg unchanged and let it report the problem.
    return { connectionString: rawUrl, schema: 'public' };
  }
}

export function isCommercialDbConfigured(): boolean {
  return getCommercialDatabaseUrl() !== null;
}

export class CommercialDbNotConfiguredError extends Error {
  constructor() {
    super(
      'COMMERCIAL_DATABASE_URL is not set. Commercial estimating persistence is unavailable in this environment.'
    );
    this.name = 'CommercialDbNotConfiguredError';
  }
}

/**
 * Returns the client, or throws if the database is not configured.
 *
 * Callers that must degrade gracefully should check `isCommercialDbConfigured()`
 * first rather than catching — a missing database is a deployment problem, not
 * a request-level error to swallow.
 */
export function commercialDb(): CommercialDb {
  const connectionString = getCommercialDatabaseUrl();
  if (!connectionString) {
    throw new CommercialDbNotConfiguredError();
  }

  if (!globalForCommercial.commercialDb) {
    const parsed = parseCommercialConnection(connectionString);
    const adapter =
      globalForCommercial.commercialAdapter ||
      new PrismaPg({ connectionString: parsed.connectionString });
    const client = new PrismaClient({ adapter });

    if (process.env.NODE_ENV !== 'production') {
      globalForCommercial.commercialAdapter = adapter;
      globalForCommercial.commercialDb = client;
    }
    return client;
  }

  return globalForCommercial.commercialDb;
}

/** Test/operational hook: drop the cached client so a new URL takes effect. */
export async function resetCommercialDb(): Promise<void> {
  const existing = globalForCommercial.commercialDb;
  globalForCommercial.commercialDb = undefined;
  globalForCommercial.commercialAdapter = undefined;
  if (existing) {
    await existing.$disconnect().catch(() => undefined);
  }
}
