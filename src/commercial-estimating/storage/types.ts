/**
 * The document storage contract.
 *
 * Originals are immutable and content-addressed by SHA-256, so a revision can
 * never quietly overwrite the drawing an estimate was measured from. Because
 * the key *is* the digest, any implementation can verify on read that the bytes
 * it got back are the bytes that were stored — see `expectedSha256For`.
 */

export type StoredDocument = {
  key: string;
  byteSize: number;
  sha256: string;
};

export interface DocumentStore {
  readonly kind: string;
  /** True when this store survives process restarts on the current host. */
  readonly durable: boolean;
  put(key: string, bytes: Uint8Array): Promise<StoredDocument>;
  get(key: string): Promise<Uint8Array>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

export class DocumentNotFoundError extends Error {
  constructor(key: string) {
    super(`No stored document for key ${key}`);
    this.name = 'DocumentNotFoundError';
  }
}

/**
 * Thrown when stored bytes do not hash to the digest their key promises.
 *
 * Deliberately distinct from "not found": a truncated transfer or a wrong
 * object returned by a proxy must never be mistaken for a missing file, and
 * must never be handed to the parser as if it were the customer's drawing.
 */
export class DocumentIntegrityError extends Error {
  constructor(
    readonly key: string,
    readonly expectedSha256: string,
    readonly actualSha256: string
  ) {
    super(
      `Stored bytes for ${key} hash to ${actualSha256}, expected ${expectedSha256}. ` +
        'The object is corrupt or was replaced.'
    );
    this.name = 'DocumentIntegrityError';
  }
}

const HEX64 = /^[0-9a-f]{64}$/;
const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Build the storage key for a document. Both inputs are validated rather than
 * escaped: a key is never derived from a user-supplied filename, so there is
 * nothing to sanitize and no traversal to defend against.
 */
export function buildDocumentKey(params: { organizationId: string; sha256: string }): string {
  const { organizationId, sha256 } = params;

  if (!SAFE_SEGMENT.test(organizationId)) {
    throw new Error(`Unsafe organizationId for storage key: ${organizationId}`);
  }
  if (!HEX64.test(sha256)) {
    throw new Error('Storage key requires a lowercase hex SHA-256 digest.');
  }

  // Fan out on the first two hex characters so no directory grows unbounded.
  return `org/${organizationId}/${sha256.slice(0, 2)}/${sha256}`;
}

/**
 * The digest a well-formed key promises its bytes will hash to, or null for a
 * key this module did not build.
 *
 * Returning null rather than throwing keeps the contract usable by a future
 * store with a different key shape; callers treat null as "cannot verify".
 */
export function expectedSha256For(key: string): string | null {
  const last = key.split('/').pop() ?? '';
  return HEX64.test(last) ? last : null;
}

/**
 * Reject anything that is not a key this module built.
 *
 * Keys are machine-generated, so this is defence in depth rather than input
 * validation — but a remote store interpolates the key into a URL path, where a
 * stray `../` or control character would be a different kind of bug than a
 * missing file.
 */
export function assertSafeStorageKey(key: string): void {
  if (key.length === 0 || key.length > 512) {
    throw new Error(`Storage key has an implausible length: ${key.length}`);
  }
  if (key.startsWith('/') || key.endsWith('/')) {
    throw new Error(`Storage key must not start or end with a slash: ${key}`);
  }
  const segments = key.split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') {
      throw new Error(`Storage key contains an unsafe path segment: ${key}`);
    }
    if (!/^[A-Za-z0-9._-]+$/.test(segment)) {
      throw new Error(`Storage key contains unexpected characters: ${key}`);
    }
  }
}
