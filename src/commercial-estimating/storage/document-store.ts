/**
 * Document storage for commercial drawing packages.
 *
 * Originals are immutable and content-addressed by SHA-256, so a revision can
 * never quietly overwrite the drawing an estimate was measured from.
 *
 * IMPORTANT DEPLOYMENT NOTE: the only implementation shipped in M1 is
 * filesystem-backed. That is correct for local development and any host with a
 * persistent volume, and WRONG for Vercel's serverless filesystem, which is
 * ephemeral — documents written there will not survive the request. The
 * `DocumentStore` interface exists precisely so a blob-backed store can be
 * dropped in as a config change; wiring one is the first task after M1 and is
 * required before this feature is usable in the current production deployment.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

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

function sha256Of(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export class FilesystemDocumentStore implements DocumentStore {
  readonly kind = 'filesystem';
  readonly durable: boolean;
  private readonly root: string;

  constructor(root: string, options?: { durable?: boolean }) {
    this.root = resolve(root);
    // Only the operator knows whether the mount survives a restart.
    this.durable = options?.durable ?? true;
  }

  private resolveKey(key: string): string {
    const target = resolve(join(this.root, key));
    // Defence in depth: keys are machine-generated, but a future caller might
    // not be, and escaping the root must never be possible.
    if (target !== this.root && !target.startsWith(this.root + sep)) {
      throw new Error(`Storage key escapes the document root: ${key}`);
    }
    return target;
  }

  async put(key: string, bytes: Uint8Array): Promise<StoredDocument> {
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });

    const digest = sha256Of(bytes);

    // Content-addressed: if the bytes are already here, storing again is a
    // no-op rather than a rewrite.
    if (!(await this.exists(key))) {
      await writeFile(target, bytes);
    }

    return { key, byteSize: bytes.length, sha256: digest };
  }

  async get(key: string): Promise<Uint8Array> {
    const target = this.resolveKey(key);
    try {
      return new Uint8Array(await readFile(target));
    } catch {
      throw new DocumentNotFoundError(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const info = await stat(this.resolveKey(key));
      return info.isFile();
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }
}

let cachedStore: DocumentStore | null = null;

export function documentStoreRoot(): string {
  return process.env.COMMERCIAL_DOCUMENT_ROOT?.trim() || join(process.cwd(), '.cortex-documents');
}

/**
 * Resolve the configured store. Today this is always the filesystem store; the
 * indirection is what lets a blob-backed store replace it without touching a
 * single caller.
 */
export function getDocumentStore(): DocumentStore {
  if (!cachedStore) {
    cachedStore = new FilesystemDocumentStore(documentStoreRoot());
  }
  return cachedStore;
}

/** Test hook. */
export function setDocumentStore(store: DocumentStore | null): void {
  cachedStore = store;
}

/**
 * True when the configured store is safe to rely on for this deployment.
 * Surfaced through the API so the limitation is visible rather than discovered
 * when a customer's drawings vanish.
 */
export function documentStorageIsDurable(): boolean {
  const store = getDocumentStore();
  if (store.kind !== 'filesystem') return store.durable;
  // Vercel's serverless filesystem is ephemeral; only /tmp is writable at all.
  return process.env.VERCEL !== '1';
}
