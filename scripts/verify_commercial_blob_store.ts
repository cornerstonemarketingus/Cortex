/**
 * Live verification of the configured commercial document store.
 *
 * The test suite drives the S3 store against a local stub and proves our
 * signature is byte-identical to the AWS signer's, but no test can prove that
 * *your* bucket, credentials, endpoint and network policy work together. This
 * script does the one thing that can: a real round trip.
 *
 *   COMMERCIAL_S3_BUCKET=... COMMERCIAL_S3_ACCESS_KEY_ID=... \
 *   COMMERCIAL_S3_SECRET_ACCESS_KEY=... COMMERCIAL_S3_ENDPOINT=... \
 *   npm run verify:blob-store
 *
 * It writes one small object under a reserved organization id, reads it back,
 * checks the digest, and deletes it. It never touches a customer key.
 */

import { randomBytes } from 'node:crypto';

import {
  buildDocumentKey,
  documentStorageDiagnostics,
  getDocumentStore,
} from '../src/commercial-estimating/storage/document-store';
import { sha256Hex } from '../src/commercial-estimating/document-processing/validation';

const RESERVED_ORG = 'storage-selfcheck';

function step(label: string, detail = ''): void {
  console.log(`  ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main(): Promise<void> {
  const diagnostics = documentStorageDiagnostics();

  console.log('\nCommercial document storage');
  console.log(`  kind:    ${diagnostics.kind}`);
  console.log(`  bucket:  ${diagnostics.bucket ?? '(n/a)'}`);
  console.log(`  durable: ${diagnostics.durable}`);
  if (diagnostics.warning) {
    console.log(`\n  ${diagnostics.warning}`);
  }

  const store = getDocumentStore();
  const bytes = new Uint8Array(randomBytes(4096));
  const digest = sha256Hex(bytes);
  const key = buildDocumentKey({ organizationId: RESERVED_ORG, sha256: digest });

  console.log(`\nRound trip on ${key}`);

  const stored = await store.put(key, bytes);
  step('put', `${stored.byteSize} bytes`);

  if (!(await store.exists(key))) {
    throw new Error('put() reported success but exists() cannot see the object.');
  }
  step('exists', 'true');

  const read = await store.get(key);
  if (read.length !== bytes.length) {
    throw new Error(`get() returned ${read.length} bytes, expected ${bytes.length}.`);
  }
  if (sha256Hex(read) !== digest) {
    throw new Error('get() returned bytes that do not match the digest in the key.');
  }
  step('get', 'digest matches');

  await store.delete(key);
  if (await store.exists(key)) {
    throw new Error('delete() reported success but the object is still there.');
  }
  step('delete', 'object removed');

  if (!diagnostics.durable) {
    console.log(
      '\nRound trip passed, but this store is NOT durable on this host. ' +
        'Uploads are refused unless COMMERCIAL_ALLOW_EPHEMERAL_STORAGE=1.'
    );
    process.exitCode = 1;
    return;
  }

  console.log('\nStorage is configured, reachable and durable.\n');
}

main().catch((error: unknown) => {
  console.error(`\nStorage verification FAILED: ${error instanceof Error ? error.message : String(error)}`);
  console.error(
    'Nothing was accepted into the store. Check the bucket name, credentials, endpoint ' +
      '(R2/MinIO need COMMERCIAL_S3_ENDPOINT) and that the key allows PutObject, GetObject, ' +
      'HeadObject and DeleteObject.\n'
  );
  process.exitCode = 1;
});
