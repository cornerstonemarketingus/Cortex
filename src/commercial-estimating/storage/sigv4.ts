/**
 * AWS Signature Version 4 request signing.
 *
 * Hand-rolled rather than pulled from an SDK, deliberately: the blob store
 * needs exactly four S3 operations (PUT/GET/HEAD/DELETE of a single object),
 * and `@aws-sdk/client-s3` would add ~15MB of dependency and a second HTTP
 * stack to a Next.js bundle for that. SigV4 is a hashing recipe, not a
 * protocol — it is small enough to implement and test directly.
 *
 * Reference: AWS "Signature Version 4 signing process". The one S3-specific
 * detail is that the canonical URI is encoded once, not twice.
 */

import { createHash, createHmac } from 'node:crypto';

export type SigV4Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
  /** Present for temporary credentials (STS / instance roles). */
  sessionToken?: string;
};

export type SignRequestInput = {
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE';
  url: URL;
  region: string;
  service: string;
  credentials: SigV4Credentials;
  /** Headers to sign, besides the ones derived here. */
  headers?: Record<string, string>;
  /** Hex SHA-256 of the request body. */
  payloadSha256Hex: string;
  /** Injectable for tests; defaults to now. */
  signedAt?: Date;
};

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function hmac(key: Uint8Array | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

/**
 * Derive the date/region/service-scoped signing key.
 *
 * The chained HMACs are what make a leaked signature useless outside its day,
 * region and service.
 */
export function deriveSigningKey(params: {
  secretAccessKey: string;
  dateStamp: string;
  region: string;
  service: string;
}): Buffer {
  const dateKey = hmac(`AWS4${params.secretAccessKey}`, params.dateStamp);
  const regionKey = hmac(dateKey, params.region);
  const serviceKey = hmac(regionKey, params.service);
  return hmac(serviceKey, 'aws4_request');
}

/**
 * Percent-encode per RFC 3986, which is stricter than encodeURIComponent:
 * `!`, `'`, `(`, `)` and `*` must be encoded too, or the canonical request
 * will not match what the service computes.
 */
function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/** Encode a path segment-by-segment so the slashes survive. */
export function canonicalUriFor(pathname: string): string {
  if (pathname === '' || pathname === '/') return '/';
  return pathname
    .split('/')
    .map((segment) => uriEncode(decodeURIComponent(segment)))
    .join('/');
}

function canonicalQueryFor(url: URL): string {
  const pairs: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => {
    pairs.push([uriEncode(key), uriEncode(value)]);
  });
  pairs.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));
  return pairs.map(([key, value]) => `${key}=${value}`).join('&');
}

export type SignedRequest = {
  headers: Record<string, string>;
  /** Exposed for assertions and debugging; never logged by the store. */
  canonicalRequest: string;
  stringToSign: string;
  signature: string;
};

export function signRequest(input: SignRequestInput): SignedRequest {
  const signedAt = input.signedAt ?? new Date();
  const amzDate = `${signedAt.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`;
  const dateStamp = amzDate.slice(0, 8);

  const headers: Record<string, string> = {
    ...(input.headers ?? {}),
    host: input.url.host,
    'x-amz-content-sha256': input.payloadSha256Hex,
    'x-amz-date': amzDate,
  };
  if (input.credentials.sessionToken) {
    headers['x-amz-security-token'] = input.credentials.sessionToken;
  }

  // Canonical headers: lowercase names, trimmed values, sorted by name.
  const normalized = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), String(value).trim().replace(/\s+/g, ' ')])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));

  const canonicalHeaders = normalized.map(([name, value]) => `${name}:${value}\n`).join('');
  const signedHeaders = normalized.map(([name]) => name).join(';');

  const canonicalRequest = [
    input.method,
    canonicalUriFor(input.url.pathname),
    canonicalQueryFor(input.url),
    canonicalHeaders,
    signedHeaders,
    input.payloadSha256Hex,
  ].join('\n');

  const credentialScope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = deriveSigningKey({
    secretAccessKey: input.credentials.secretAccessKey,
    dateStamp,
    region: input.region,
    service: input.service,
  });
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  return {
    headers: {
      ...headers,
      authorization:
        `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    canonicalRequest,
    stringToSign,
    signature,
  };
}
