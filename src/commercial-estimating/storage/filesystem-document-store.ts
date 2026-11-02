/**
 * Filesystem-backed document storage.
 *
 * Correct for local development and for any host with a persistent volume, and
 * WRONG for a serverless filesystem, which is ephemeral. The deployment guard
 * in `document-store.ts` is what stops that combination from silently eating a
 * customer's drawings.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import {
  DocumentIntegrityError,
  DocumentNotFoundError,
  expectedSha256For,
  type DocumentStore,
  type StoredDocument,
} from './types';

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
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await readFile(target));
    } catch {
      throw new DocumentNotFoundError(key);
    }

    // The key is the digest, so a partial write or an edited file is detectable
    // rather than something the parser finds out the hard way.
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
