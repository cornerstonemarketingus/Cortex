/**
 * Blob-backed document storage over the S3 HTTP API.
 *
 * Works against anything that speaks S3 with SigV4 — AWS S3, Cloudflare R2,
 * Backblaze B2, MinIO — which is what makes this the portable answer to M1's
 * one production blocker: a serverless filesystem loses every uploaded drawing.
 *
 * Four operations, `fetch`, and `sigv4.ts`. No SDK: see the note there.
 *
 * Two properties this relies on, both earned by content addressing:
 *   - every operation is idempotent, so a retry can never corrupt anything;
 *   - the key is the digest, so a read can verify what it got back.
 */

import { createHash } from 'node:crypto';

import { signRequest, type SigV4Credentials } from './sigv4';
import {
  DocumentIntegrityError,
  DocumentNotFoundError,
  assertSafeStorageKey,
  expectedSha256For,
  type DocumentStore,
  type StoredDocument,
} from './types';

const EMPTY_PAYLOAD_SHA256 = createHash('sha256').update('').digest('hex');

export type S3DocumentStoreConfig = {
  bucket: string;
  region: string;
  /** Required for non-AWS endpoints (R2, MinIO); omit for AWS S3. */
  endpoint?: string;
  credentials: SigV4Credentials;
  /** Path-style addressing (`/bucket/key`) rather than a bucket subdomain. */
  forcePathStyle?: boolean;
  /** Optional key prefix, so one bucket can hold more than this app. */
  prefix?: string;
  maxAttempts?: number;
  requestTimeoutMs?: number;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests, so signatures are deterministic. */
  now?: () => Date;
  /** Injectable for tests, so retry backoff does not slow the suite. */
  sleep?: (ms: number) => Promise<void>;
};

export class S3StorageError extends Error {
  constructor(
    readonly operation: string,
    readonly key: string,
    readonly status: number,
    readonly detail: string
  ) {
    super(`S3 ${operation} for ${key} failed with ${status}: ${detail}`);
    this.name = 'S3StorageError';
  }
}

function sha256Of(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class S3DocumentStore implements DocumentStore {
  readonly kind = 's3';
  /** A blob store is the reason this class exists. */
  readonly durable = true;
  /** Safe to surface: a bucket name is not a credential. */
  readonly bucket: string;

  private readonly config: Required<
    Pick<S3DocumentStoreConfig, 'bucket' | 'region' | 'maxAttempts' | 'requestTimeoutMs'>
  > &
    S3DocumentStoreConfig;
  private readonly baseUrl: URL;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(config: S3DocumentStoreConfig) {
    if (!config.bucket) throw new Error('S3DocumentStore requires a bucket.');
    if (!config.credentials?.accessKeyId || !config.credentials?.secretAccessKey) {
      throw new Error('S3DocumentStore requires an access key id and secret access key.');
    }

    this.bucket = config.bucket;
    this.config = {
      ...config,
      region: config.region || 'us-east-1',
      maxAttempts: config.maxAttempts ?? 3,
      requestTimeoutMs: config.requestTimeoutMs ?? 120_000,
    };

    const endpoint = config.endpoint?.replace(/\/+$/, '');
    // Path style is the default whenever an endpoint is given: R2 and MinIO
    // either require it or are commonly deployed without wildcard DNS.
    const pathStyle = config.forcePathStyle ?? Boolean(endpoint);

    if (endpoint) {
      const parsed = new URL(endpoint);
      this.baseUrl = pathStyle
        ? new URL(`${parsed.origin}/${config.bucket}/`)
        : new URL(`${parsed.protocol}//${config.bucket}.${parsed.host}/`);
    } else {
      this.baseUrl = pathStyle
        ? new URL(`https://s3.${this.config.region}.amazonaws.com/${config.bucket}/`)
        : new URL(`https://${config.bucket}.s3.${this.config.region}.amazonaws.com/`);
    }

    this.fetchImpl = config.fetchImpl ?? fetch;
    this.now = config.now ?? (() => new Date());
    this.sleep = config.sleep ?? defaultSleep;
  }

  /** The object path for a logical key, including any configured prefix. */
  private objectUrl(key: string): URL {
    assertSafeStorageKey(key);
    const prefix = this.config.prefix?.replace(/^\/+|\/+$/g, '');
    const objectKey = prefix ? `${prefix}/${key}` : key;
    // The base URL always ends in '/', so the key resolves beneath it. Keys are
    // validated above, so no segment can walk out of the bucket or prefix.
    return new URL(objectKey, this.baseUrl);
  }

  private async send(params: {
    operation: string;
    key: string;
    method: 'GET' | 'PUT' | 'HEAD' | 'DELETE';
    url: URL;
    body?: Uint8Array;
    payloadSha256Hex: string;
    extraHeaders?: Record<string, string>;
    /** Statuses the caller handles itself rather than treating as failures. */
    expectedStatuses: number[];
  }): Promise<Response> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt += 1) {
      const signed = signRequest({
        method: params.method,
        url: params.url,
        region: this.config.region,
        service: 's3',
        credentials: this.config.credentials,
        headers: params.extraHeaders,
        payloadSha256Hex: params.payloadSha256Hex,
        signedAt: this.now(),
      });

      let response: Response;
      try {
        response = await this.fetchImpl(params.url, {
          method: params.method,
          headers: signed.headers,
          body: params.body ? (params.body as unknown as BodyInit) : undefined,
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        });
      } catch (error) {
        // Network failure or timeout. Every operation here is idempotent, so
        // retrying is safe.
        lastError = error;
        if (attempt < this.config.maxAttempts) {
          await this.sleep(attempt * 100);
          continue;
        }
        throw new S3StorageError(
          params.operation,
          params.key,
          0,
          error instanceof Error ? error.message : String(error)
        );
      }

      if (params.expectedStatuses.includes(response.status)) {
        return response;
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < this.config.maxAttempts) {
        await this.sleep(attempt * 100);
        continue;
      }

      // Bounded: S3 errors are XML and the useful part is at the front. Never
      // log or attach request headers — they carry the signature.
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      throw new S3StorageError(params.operation, params.key, response.status, detail);
    }

    throw new S3StorageError(
      params.operation,
      params.key,
      0,
      lastError instanceof Error ? lastError.message : 'Exhausted retries.'
    );
  }

  async put(key: string, bytes: Uint8Array): Promise<StoredDocument> {
    const url = this.objectUrl(key);
    const digest = sha256Of(bytes);

    // Content-addressed: identical bytes under the same key are already the
    // same object, so re-uploading is a no-op rather than a rewrite. This also
    // makes a retried customer upload free.
    if (await this.exists(key)) {
      return { key, byteSize: bytes.length, sha256: digest };
    }

    await this.send({
      operation: 'PUT',
      key,
      method: 'PUT',
      url,
      body: bytes,
      payloadSha256Hex: digest,
      extraHeaders: {
        'content-type': 'application/octet-stream',
        // Ask the service to verify the write itself, so a corrupted upload is
        // rejected at the far end instead of being stored as the customer's
        // drawing.
        //
        // content-length is deliberately NOT signed: fetch sets it, and an
        // intermediary that re-chunks the request would otherwise invalidate
        // the signature. The payload hash already binds the body.
        'x-amz-checksum-sha256': Buffer.from(digest, 'hex').toString('base64'),
      },
      expectedStatuses: [200, 201],
    });

    return { key, byteSize: bytes.length, sha256: digest };
  }

  async get(key: string): Promise<Uint8Array> {
    const response = await this.send({
      operation: 'GET',
      key,
      method: 'GET',
      url: this.objectUrl(key),
      payloadSha256Hex: EMPTY_PAYLOAD_SHA256,
      expectedStatuses: [200, 404],
    });

    if (response.status === 404) {
      throw new DocumentNotFoundError(key);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    // A truncated transfer or a wrong object from a cache must not reach the
    // parser dressed as the customer's drawing.
    const expected = expectedSha256For(key);
    if (expected) {
      const actual = sha256Of(bytes);
      if (actual !== expected) {
        throw new DocumentIntegrityError(key, expected, actual);
      }
    }

    return bytes;
  }

  async exists(key: string): Promise<boolean> {
    const response = await this.send({
      operation: 'HEAD',
      key,
      method: 'HEAD',
      url: this.objectUrl(key),
      payloadSha256Hex: EMPTY_PAYLOAD_SHA256,
      expectedStatuses: [200, 404],
    });
    return response.status === 200;
  }

  async delete(key: string): Promise<void> {
    await this.send({
      operation: 'DELETE',
      key,
      method: 'DELETE',
      url: this.objectUrl(key),
      payloadSha256Hex: EMPTY_PAYLOAD_SHA256,
      // 404 is success for a delete: the object is not there either way.
      expectedStatuses: [200, 204, 404],
    });
  }
}

export type S3EnvConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  forcePathStyle?: boolean;
  prefix?: string;
};

function envValue(name: string): string | undefined {
  const value = process.env[name];
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Read the S3 configuration from the environment.
 *
 * Returns null when nothing is configured, and throws when the configuration is
 * half-finished: a bucket with no credentials is a deployment mistake, and
 * silently falling back to the ephemeral filesystem is exactly the failure this
 * whole change exists to prevent.
 */
export function s3ConfigFromEnv(): S3EnvConfig | null {
  const bucket = envValue('COMMERCIAL_S3_BUCKET');
  const accessKeyId = envValue('COMMERCIAL_S3_ACCESS_KEY_ID');
  const secretAccessKey = envValue('COMMERCIAL_S3_SECRET_ACCESS_KEY');
  const endpoint = envValue('COMMERCIAL_S3_ENDPOINT');

  if (!bucket && !accessKeyId && !secretAccessKey && !endpoint) {
    return null;
  }

  const missing = [
    !bucket ? 'COMMERCIAL_S3_BUCKET' : null,
    !accessKeyId ? 'COMMERCIAL_S3_ACCESS_KEY_ID' : null,
    !secretAccessKey ? 'COMMERCIAL_S3_SECRET_ACCESS_KEY' : null,
  ].filter((name): name is string => name !== null);

  if (missing.length > 0) {
    throw new Error(
      `Commercial document storage is partially configured. Missing: ${missing.join(', ')}. ` +
        'Set all of them, or unset the S3 variables to fall back to filesystem storage.'
    );
  }

  const forcePathStyleRaw = envValue('COMMERCIAL_S3_FORCE_PATH_STYLE');

  return {
    bucket: bucket as string,
    // 'auto' is the R2 convention; AWS needs a real region.
    region: envValue('COMMERCIAL_S3_REGION') ?? (endpoint ? 'auto' : 'us-east-1'),
    endpoint,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    sessionToken: envValue('COMMERCIAL_S3_SESSION_TOKEN'),
    forcePathStyle: forcePathStyleRaw ? forcePathStyleRaw === '1' : undefined,
    prefix: envValue('COMMERCIAL_S3_PREFIX'),
  };
}

export function s3StoreFromEnv(config: S3EnvConfig): S3DocumentStore {
  const timeoutRaw = Number.parseInt(process.env.COMMERCIAL_S3_TIMEOUT_MS ?? '', 10);

  return new S3DocumentStore({
    bucket: config.bucket,
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    prefix: config.prefix,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken,
    },
    requestTimeoutMs: Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : undefined,
  });
}
