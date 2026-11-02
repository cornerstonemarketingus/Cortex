/**
 * Document storage composition root.
 *
 * Originals are immutable and content-addressed by SHA-256, so a revision can
 * never quietly overwrite the drawing an estimate was measured from.
 *
 * Two implementations:
 *   - `S3DocumentStore` — any S3-compatible blob store (AWS S3, Cloudflare R2,
 *     MinIO, Backblaze). Durable. Use this in production.
 *   - `FilesystemDocumentStore` — local development and hosts with a persistent
 *     volume. On a serverless filesystem it loses every uploaded drawing, which
 *     is why `assertDurableDocumentStorage()` exists.
 *
 * Selection is by environment variable; no caller knows which store it has.
 */

import { join } from 'node:path';

import { FilesystemDocumentStore } from './filesystem-document-store';
import { S3DocumentStore, s3ConfigFromEnv, s3StoreFromEnv } from './s3-document-store';
import type { DocumentStore } from './types';

export {
  buildDocumentKey,
  expectedSha256For,
  assertSafeStorageKey,
  DocumentNotFoundError,
  DocumentIntegrityError,
  type DocumentStore,
  type StoredDocument,
} from './types';
export { FilesystemDocumentStore } from './filesystem-document-store';
export {
  S3DocumentStore,
  S3StorageError,
  s3ConfigFromEnv,
  type S3DocumentStoreConfig,
} from './s3-document-store';

let cachedStore: DocumentStore | null = null;

export function documentStoreRoot(): string {
  return process.env.COMMERCIAL_DOCUMENT_ROOT?.trim() || join(process.cwd(), '.cortex-documents');
}

/**
 * Resolve the configured store.
 *
 * `COMMERCIAL_DOCUMENT_STORE` forces a choice (`s3` or `filesystem`);
 * otherwise the S3 store is used whenever S3 credentials are present. A
 * half-configured S3 environment throws rather than falling back, because a
 * silent fallback to an ephemeral filesystem is the data-loss path this module
 * is here to close.
 */
export function getDocumentStore(): DocumentStore {
  if (cachedStore) return cachedStore;

  const requested = process.env.COMMERCIAL_DOCUMENT_STORE?.trim().toLowerCase();

  if (requested === 'filesystem') {
    cachedStore = new FilesystemDocumentStore(documentStoreRoot());
    return cachedStore;
  }

  const s3Config = s3ConfigFromEnv();

  if (requested === 's3') {
    if (!s3Config) {
      throw new Error(
        'COMMERCIAL_DOCUMENT_STORE=s3 but no S3 configuration was found. Set ' +
          'COMMERCIAL_S3_BUCKET, COMMERCIAL_S3_ACCESS_KEY_ID and COMMERCIAL_S3_SECRET_ACCESS_KEY.'
      );
    }
    cachedStore = s3StoreFromEnv(s3Config);
    return cachedStore;
  }

  if (requested && requested !== 's3' && requested !== 'filesystem') {
    throw new Error(
      `Unknown COMMERCIAL_DOCUMENT_STORE=${requested}. Valid values are "s3" and "filesystem".`
    );
  }

  cachedStore = s3Config
    ? s3StoreFromEnv(s3Config)
    : new FilesystemDocumentStore(documentStoreRoot());
  return cachedStore;
}

/** Test hook; also clears the cache so an env change takes effect. */
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
  if (!store.durable) return false;
  if (store.kind !== 'filesystem') return true;
  // Vercel's serverless filesystem is ephemeral; only /tmp is writable at all.
  // The host overrides the store's own optimism, not the other way round.
  return process.env.VERCEL !== '1';
}

/** Why storage is not durable, for an operator reading an error or a payload. */
export function documentStorageWarning(): string | null {
  if (documentStorageIsDurable()) return null;
  return (
    'Document storage is not durable on this deployment: uploaded drawings are written to an ' +
    'ephemeral serverless filesystem and will not survive the request. Configure an ' +
    'S3-compatible blob store (COMMERCIAL_S3_BUCKET, COMMERCIAL_S3_ACCESS_KEY_ID, ' +
    'COMMERCIAL_S3_SECRET_ACCESS_KEY, and COMMERCIAL_S3_ENDPOINT for R2/MinIO), or a ' +
    'persistent volume with COMMERCIAL_DOCUMENT_ROOT.'
  );
}

/**
 * The reason an upload must be refused, or null when storage can be trusted.
 *
 * Accepting a 200MB drawing package onto an ephemeral filesystem — and metering
 * it — produces a customer who believes their project is saved and a vanished
 * document. Failing the upload is the honest outcome. Set
 * `COMMERCIAL_ALLOW_EPHEMERAL_STORAGE=1` to accept that trade knowingly, which
 * is reasonable for a demo and never for production.
 *
 * Returning the message rather than throwing keeps the HTTP status code in the
 * API layer, where the other refusals live.
 */
export function durableStorageRefusal(): string | null {
  if (documentStorageIsDurable()) return null;
  if (process.env.COMMERCIAL_ALLOW_EPHEMERAL_STORAGE === '1') return null;
  return documentStorageWarning();
}

/** Storage facts for the API payloads, with no credentials in them. */
export function documentStorageDiagnostics(): {
  kind: string;
  durable: boolean;
  bucket: string | null;
  warning: string | null;
} {
  const store = getDocumentStore();
  return {
    kind: store.kind,
    durable: documentStorageIsDurable(),
    bucket: store instanceof S3DocumentStore ? store.bucket : null,
    warning: documentStorageWarning(),
  };
}
