/**
 * Tests for blob-backed document storage.
 *
 * These run with no cloud credentials and no network: the S3 store is driven
 * against a local HTTP server that speaks enough of the S3 object API to be
 * honest about it — it verifies the SHA-256 checksum header on write, serves
 * 404s for absent keys, and can be told to fail or to corrupt a response.
 *
 * That is deliberately stronger than mocking the store: the code under test
 * signs a real request, sends it over a real socket, and parses a real
 * response, so signing, retries, integrity checking and error mapping are all
 * exercised. What it cannot prove is that a particular vendor accepts our
 * signature — only a live bucket can, which is why the deployment doc asks for
 * one round trip against the real store before trusting it with customer work.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AddressInfo } from 'node:net';

import { describe, it, withEnv } from './harness';
import { canonicalUriFor, deriveSigningKey, signRequest } from '@/src/commercial-estimating/storage/sigv4';
import {
  S3DocumentStore,
  S3StorageError,
} from '@/src/commercial-estimating/storage/s3-document-store';
import {
  DocumentIntegrityError,
  DocumentNotFoundError,
  FilesystemDocumentStore,
  buildDocumentKey,
  documentStorageIsDurable,
  documentStorageDiagnostics,
  durableStorageRefusal,
  getDocumentStore,
  setDocumentStore,
} from '@/src/commercial-estimating/storage/document-store';

const BUCKET = 'cortex-documents-test';
const CREDENTIALS = { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/EXAMPLEKEY' };

function sha256Hex(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function keyFor(bytes: Uint8Array, organizationId = 'org1'): string {
  return buildDocumentKey({ organizationId, sha256: sha256Hex(bytes) });
}

type StubRequest = {
  method: string;
  path: string;
  checksum: string | null;
  contentSha256: string | null;
  authorization: string | null;
};

type Stub = {
  server: Server;
  origin: string;
  objects: Map<string, Buffer>;
  requests: StubRequest[];
  /** Statuses to return instead of handling the next N requests. */
  failWith: number[];
  /** Serve the next GET with a tampered body. */
  corruptNextGet: boolean;
  close(): Promise<void>;
};

async function startStub(): Promise<Stub> {
  const objects = new Map<string, Buffer>();
  const requests: StubRequest[] = [];
  const state = { failWith: [] as number[], corruptNextGet: false };

  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const path = req.url ?? '';
      requests.push({
        method: req.method ?? '',
        path,
        checksum: (req.headers['x-amz-checksum-sha256'] as string) ?? null,
        contentSha256: (req.headers['x-amz-content-sha256'] as string) ?? null,
        authorization: (req.headers.authorization as string) ?? null,
      });

      const forcedStatus = state.failWith.shift();
      if (forcedStatus) {
        res.writeHead(forcedStatus, { 'content-type': 'application/xml' });
        res.end('<Error><Code>InternalError</Code></Error>');
        return;
      }

      // Path-style addressing: /<bucket>/<key>
      const prefix = `/${BUCKET}/`;
      if (!path.startsWith(prefix)) {
        res.writeHead(400).end('<Error><Code>NoSuchBucket</Code></Error>');
        return;
      }
      const key = decodeURIComponent(path.slice(prefix.length));

      if (req.method === 'PUT') {
        // A real service rejects a write whose checksum does not match; so does
        // this one, or the test could not prove we send a usable checksum.
        const declared = req.headers['x-amz-checksum-sha256'] as string | undefined;
        if (declared) {
          const actual = Buffer.from(sha256Hex(body), 'hex').toString('base64');
          if (declared !== actual) {
            res.writeHead(400).end('<Error><Code>BadDigest</Code></Error>');
            return;
          }
        }
        objects.set(key, body);
        res.writeHead(200).end();
        return;
      }

      if (req.method === 'GET') {
        const stored = objects.get(key);
        if (!stored) {
          res.writeHead(404, { 'content-type': 'application/xml' });
          res.end('<Error><Code>NoSuchKey</Code></Error>');
          return;
        }
        const served = state.corruptNextGet ? Buffer.from('not your drawing') : stored;
        state.corruptNextGet = false;
        res.writeHead(200, { 'content-length': String(served.length) });
        res.end(served);
        return;
      }

      if (req.method === 'HEAD') {
        const stored = objects.get(key);
        if (!stored) {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, { 'content-length': String(stored.length) }).end();
        return;
      }

      if (req.method === 'DELETE') {
        objects.delete(key);
        res.writeHead(204).end();
        return;
      }

      res.writeHead(405).end();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    server,
    origin: `http://127.0.0.1:${port}`,
    objects,
    requests,
    get failWith() {
      return state.failWith;
    },
    set failWith(value: number[]) {
      state.failWith = value;
    },
    get corruptNextGet() {
      return state.corruptNextGet;
    },
    set corruptNextGet(value: boolean) {
      state.corruptNextGet = value;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function storeFor(stub: Stub, overrides: Partial<{ prefix: string; maxAttempts: number }> = {}) {
  return new S3DocumentStore({
    bucket: BUCKET,
    region: 'auto',
    endpoint: stub.origin,
    forcePathStyle: true,
    credentials: CREDENTIALS,
    requestTimeoutMs: 5_000,
    // Keep retry backoff out of the suite's runtime.
    sleep: async () => {},
    ...overrides,
  });
}

async function withStub(fn: (stub: Stub) => Promise<void>): Promise<void> {
  const stub = await startStub();
  try {
    await fn(stub);
  } finally {
    await stub.close();
  }
}

describe('storage: SigV4 signing', () => {
  it('derives the signing key from AWS’s documented example', () => {
    // From the AWS SigV4 documentation's "derive a signing key" worked example.
    const key = deriveSigningKey({
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      dateStamp: '20120215',
      region: 'us-east-1',
      service: 'iam',
    });
    assert.equal(
      key.toString('hex'),
      'f4780e2d9f65fa895f9c67b32ce1baf0b0d8a43505a000a1a9e090d414db404d'
    );
  });

  it('builds an Authorization header with the credential scope and signed headers', () => {
    const signed = signRequest({
      method: 'GET',
      url: new URL('https://example.r2.cloudflarestorage.com/bucket/org/org1/ab/' + 'a'.repeat(64)),
      region: 'auto',
      service: 's3',
      credentials: CREDENTIALS,
      payloadSha256Hex: sha256Hex(''),
      signedAt: new Date('2026-01-02T03:04:05Z'),
    });

    assert.match(
      signed.headers.authorization,
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20260102\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/
    );
    assert.equal(signed.headers['x-amz-date'], '20260102T030405Z');
  });

  it('binds the signature to the payload', () => {
    const base = {
      method: 'PUT' as const,
      url: new URL('https://example.com/bucket/key'),
      region: 'auto',
      service: 's3',
      credentials: CREDENTIALS,
      signedAt: new Date('2026-01-02T03:04:05Z'),
    };
    const a = signRequest({ ...base, payloadSha256Hex: sha256Hex('one') });
    const b = signRequest({ ...base, payloadSha256Hex: sha256Hex('two') });
    assert.notEqual(a.signature, b.signature);
  });

  it('binds the signature to the region and the day', () => {
    const base = {
      method: 'GET' as const,
      url: new URL('https://example.com/bucket/key'),
      service: 's3',
      credentials: CREDENTIALS,
      payloadSha256Hex: sha256Hex(''),
    };
    const one = signRequest({ ...base, region: 'auto', signedAt: new Date('2026-01-02T00:00:00Z') });
    const otherRegion = signRequest({
      ...base,
      region: 'us-west-2',
      signedAt: new Date('2026-01-02T00:00:00Z'),
    });
    const otherDay = signRequest({
      ...base,
      region: 'auto',
      signedAt: new Date('2026-01-03T00:00:00Z'),
    });

    assert.notEqual(one.signature, otherRegion.signature);
    assert.notEqual(one.signature, otherDay.signature);
  });

  it('encodes path segments without eating the slashes', () => {
    assert.equal(canonicalUriFor('/bucket/org/org1/ab/cd'), '/bucket/org/org1/ab/cd');
    assert.equal(canonicalUriFor('/bucket/a b*c'), '/bucket/a%20b%2Ac');
    assert.equal(canonicalUriFor('/'), '/');
  });
});

describe('storage: SigV4 cross-check against the AWS signer', () => {
  /**
   * The stub server cannot prove a real bucket will accept our signature, so
   * this asserts the stronger thing: for the requests this store actually
   * makes, our Authorization header is byte-identical to the one AWS's own
   * signing library produces. `@smithy/signature-v4` is a devDependency and
   * ships in no bundle.
   */
  async function awsAuthorization(params: {
    method: 'GET' | 'PUT';
    url: URL;
    region: string;
    headers: Record<string, string>;
    body?: Buffer;
    payloadSha256Hex: string;
    signedAt: Date;
  }): Promise<string> {
    const [{ SignatureV4 }, { HttpRequest }, { Sha256 }] = await Promise.all([
      import('@smithy/signature-v4'),
      import('@smithy/protocol-http'),
      import('@aws-crypto/sha256-js'),
    ]);

    const signer = new SignatureV4({
      service: 's3',
      region: params.region,
      sha256: Sha256,
      credentials: CREDENTIALS,
      // S3 encodes the path once, and we supply our own payload hash.
      uriEscapePath: false,
      applyChecksum: false,
    });

    const signed = await signer.sign(
      new HttpRequest({
        method: params.method,
        protocol: params.url.protocol,
        hostname: params.url.hostname,
        path: params.url.pathname,
        headers: {
          host: params.url.host,
          ...params.headers,
          'x-amz-content-sha256': params.payloadSha256Hex,
        },
        body: params.body,
      }),
      { signingDate: params.signedAt }
    );

    return (signed.headers.authorization ?? signed.headers.Authorization) as string;
  }

  it('matches the AWS signer for a PUT with a body', async () => {
    const body = Buffer.from('%PDF-1.7 drawing');
    const payloadSha256Hex = sha256Hex(body);
    const url = new URL(`https://acct.r2.cloudflarestorage.com/bucket/${keyFor(body)}`);
    const signedAt = new Date('2026-03-04T05:06:07Z');
    // Mirrors what the store actually sends: content-type and the checksum,
    // never content-length (see the note in s3-document-store.ts).
    const headers = {
      'content-type': 'application/octet-stream',
      'x-amz-checksum-sha256': Buffer.from(payloadSha256Hex, 'hex').toString('base64'),
    };

    const ours = signRequest({
      method: 'PUT',
      url,
      region: 'auto',
      service: 's3',
      credentials: CREDENTIALS,
      headers,
      payloadSha256Hex,
      signedAt,
    });

    assert.equal(
      ours.headers.authorization,
      await awsAuthorization({ method: 'PUT', url, region: 'auto', headers, body, payloadSha256Hex, signedAt })
    );
  });

  it('matches the AWS signer for a GET with an empty payload', async () => {
    const url = new URL('https://bucket.s3.us-west-2.amazonaws.com/org/org1/ab/' + 'd'.repeat(64));
    const signedAt = new Date('2026-07-08T09:10:11Z');
    const payloadSha256Hex = sha256Hex('');

    const ours = signRequest({
      method: 'GET',
      url,
      region: 'us-west-2',
      service: 's3',
      credentials: CREDENTIALS,
      payloadSha256Hex,
      signedAt,
    });

    assert.equal(
      ours.headers.authorization,
      await awsAuthorization({
        method: 'GET',
        url,
        region: 'us-west-2',
        headers: {},
        payloadSha256Hex,
        signedAt,
      })
    );
  });
});

describe('storage: S3 document store', () => {
  const bytes = new Uint8Array(Buffer.from('%PDF-1.7 pretend drawing package'));
  const key = keyFor(bytes);

  it('round-trips the exact bytes', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub);
      const stored = await store.put(key, bytes);

      assert.equal(stored.sha256, sha256Hex(bytes));
      assert.equal(stored.byteSize, bytes.length);

      const read = await store.get(key);
      assert.deepEqual(Buffer.from(read), Buffer.from(bytes));
    });
  });

  it('sends a checksum the service can verify', async () => {
    await withStub(async (stub) => {
      await storeFor(stub).put(key, bytes);

      const put = stub.requests.find((entry) => entry.method === 'PUT');
      assert.ok(put, 'expected a PUT');
      assert.equal(put.checksum, Buffer.from(sha256Hex(bytes), 'hex').toString('base64'));
      // The payload hash is signed, so a proxy cannot alter the body in flight.
      assert.equal(put.contentSha256, sha256Hex(bytes));
    });
  });

  it('does not re-upload bytes that are already stored', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub);
      await store.put(key, bytes);
      await store.put(key, bytes);

      const puts = stub.requests.filter((entry) => entry.method === 'PUT');
      assert.equal(puts.length, 1, 'content-addressed storage should skip the second write');
    });
  });

  it('reports existence without downloading the object', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub);
      assert.equal(await store.exists(key), false);
      await store.put(key, bytes);
      assert.equal(await store.exists(key), true);
      assert.equal(
        stub.requests.filter((entry) => entry.method === 'GET').length,
        0,
        'exists() must not fetch the body'
      );
    });
  });

  it('raises DocumentNotFoundError for a missing key', async () => {
    await withStub(async (stub) => {
      await assert.rejects(
        () => storeFor(stub).get(keyFor(new Uint8Array([1, 2, 3]))),
        DocumentNotFoundError
      );
    });
  });

  it('refuses bytes that do not match the digest in their key', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub);
      await store.put(key, bytes);
      stub.corruptNextGet = true;

      // The alternative is handing a truncated or substituted file to the
      // parser and reporting whatever it finds as the customer's drawing.
      await assert.rejects(() => store.get(key), DocumentIntegrityError);
    });
  });

  it('treats deleting an absent object as success', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub);
      await store.put(key, bytes);
      await store.delete(key);
      assert.equal(await store.exists(key), false);
      await store.delete(key);
    });
  });

  it('retries a server error and then succeeds', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub);
      stub.failWith = [500];

      const read = await (async () => {
        await store.put(key, bytes);
        return store.get(key);
      })();

      assert.deepEqual(Buffer.from(read), Buffer.from(bytes));
    });
  });

  it('gives up after the attempt limit and names the status', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub, { maxAttempts: 2 });
      stub.failWith = [503, 503, 503, 503];

      await assert.rejects(
        () => store.put(key, bytes),
        (error: unknown) => {
          assert.ok(error instanceof S3StorageError);
          assert.equal(error.status, 503);
          return true;
        }
      );
    });
  });

  it('does not retry a client error', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub);
      stub.failWith = [403, 403, 403];

      await assert.rejects(() => store.exists(key), S3StorageError);
      assert.equal(stub.requests.length, 1, '403 is not worth retrying');
    });
  });

  it('rejects a storage key that could escape the bucket', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub);
      await assert.rejects(() => store.get('org/org1/../../etc/passwd'), /unsafe path segment/);
      await assert.rejects(() => store.get('/leading-slash'), /start or end with a slash/);
      await assert.rejects(() => store.get('org/org1/we ird'), /unexpected characters/);
    });
  });

  it('stores beneath the configured prefix', async () => {
    await withStub(async (stub) => {
      const store = storeFor(stub, { prefix: 'cortex/commercial' });
      await store.put(key, bytes);

      assert.ok(
        stub.objects.has(`cortex/commercial/${key}`),
        `expected prefixed key, saw ${[...stub.objects.keys()].join(', ')}`
      );
      assert.deepEqual(Buffer.from(await store.get(key)), Buffer.from(bytes));
    });
  });

  it('is durable', async () => {
    await withStub(async (stub) => {
      assert.equal(storeFor(stub).durable, true);
      assert.equal(storeFor(stub).kind, 's3');
    });
  });
});

describe('storage: filesystem store integrity', () => {
  it('refuses a file whose bytes no longer match its key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cortex-store-'));
    try {
      const store = new FilesystemDocumentStore(root);
      const bytes = new Uint8Array(Buffer.from('original drawing'));
      const key = keyFor(bytes);
      await store.put(key, bytes);

      // Simulate a partial write or an edited volume.
      const { writeFile } = await import('node:fs/promises');
      await writeFile(join(root, key), Buffer.from('tampered'));

      await assert.rejects(() => store.get(key), DocumentIntegrityError);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('storage: configuration', () => {
  const s3Env = {
    COMMERCIAL_S3_BUCKET: 'cortex-docs',
    COMMERCIAL_S3_ACCESS_KEY_ID: 'AKID',
    COMMERCIAL_S3_SECRET_ACCESS_KEY: 'secret',
    COMMERCIAL_S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
    COMMERCIAL_DOCUMENT_STORE: undefined,
    COMMERCIAL_ALLOW_EPHEMERAL_STORAGE: undefined,
    VERCEL: undefined,
  };

  const noStoreEnv = {
    COMMERCIAL_S3_BUCKET: undefined,
    COMMERCIAL_S3_ACCESS_KEY_ID: undefined,
    COMMERCIAL_S3_SECRET_ACCESS_KEY: undefined,
    COMMERCIAL_S3_ENDPOINT: undefined,
    COMMERCIAL_DOCUMENT_STORE: undefined,
    COMMERCIAL_ALLOW_EPHEMERAL_STORAGE: undefined,
    VERCEL: undefined,
  };

  it('falls back to the filesystem when nothing is configured', async () => {
    await withEnv(noStoreEnv, () => {
      setDocumentStore(null);
      assert.equal(getDocumentStore().kind, 'filesystem');
      setDocumentStore(null);
    });
  });

  it('uses the blob store when S3 credentials are present', async () => {
    await withEnv(s3Env, () => {
      setDocumentStore(null);
      const store = getDocumentStore();
      assert.equal(store.kind, 's3');
      assert.equal(documentStorageIsDurable(), true);
      assert.equal(documentStorageDiagnostics().bucket, 'cortex-docs');
      setDocumentStore(null);
    });
  });

  it('honours an explicit filesystem choice over S3 credentials', async () => {
    await withEnv({ ...s3Env, COMMERCIAL_DOCUMENT_STORE: 'filesystem' }, () => {
      setDocumentStore(null);
      assert.equal(getDocumentStore().kind, 'filesystem');
      setDocumentStore(null);
    });
  });

  it('refuses to start on a half-configured blob store', async () => {
    // The dangerous version of this is a silent fallback to the ephemeral
    // filesystem, which looks like it works until the drawings are gone.
    await withEnv({ ...s3Env, COMMERCIAL_S3_SECRET_ACCESS_KEY: undefined }, () => {
      setDocumentStore(null);
      assert.throws(() => getDocumentStore(), /partially configured/);
      setDocumentStore(null);
    });
  });

  it('rejects an unknown store name rather than guessing', async () => {
    await withEnv({ ...noStoreEnv, COMMERCIAL_DOCUMENT_STORE: 'gcs' }, () => {
      setDocumentStore(null);
      assert.throws(() => getDocumentStore(), /Unknown COMMERCIAL_DOCUMENT_STORE/);
      setDocumentStore(null);
    });
  });

  it('refuses uploads on an ephemeral filesystem', async () => {
    await withEnv({ ...noStoreEnv, VERCEL: '1' }, () => {
      setDocumentStore(null);
      assert.equal(documentStorageIsDurable(), false);
      assert.match(durableStorageRefusal() ?? '', /not durable/);
      setDocumentStore(null);
    });
  });

  it('allows the ephemeral trade only when the operator opts in', async () => {
    await withEnv(
      { ...noStoreEnv, VERCEL: '1', COMMERCIAL_ALLOW_EPHEMERAL_STORAGE: '1' },
      () => {
        setDocumentStore(null);
        assert.equal(durableStorageRefusal(), null);
        // Still reported as not durable: opting in does not make it safe.
        assert.equal(documentStorageIsDurable(), false);
        setDocumentStore(null);
      }
    );
  });

  it('believes a store that declares its own volume ephemeral', async () => {
    // An operator who knows the mount is a scratch disk must be able to say so
    // without pretending to be Vercel.
    await withEnv(noStoreEnv, () => {
      setDocumentStore(new FilesystemDocumentStore('/tmp/cortex-ephemeral', { durable: false }));
      assert.equal(documentStorageIsDurable(), false);
      assert.match(durableStorageRefusal() ?? '', /not durable/);
      setDocumentStore(null);
    });
  });

  it('never puts a credential in the diagnostics payload', async () => {
    await withEnv(s3Env, () => {
      setDocumentStore(null);
      const serialized = JSON.stringify(documentStorageDiagnostics());
      assert.ok(!serialized.includes('secret'), serialized);
      assert.ok(!serialized.includes('AKID'), serialized);
      setDocumentStore(null);
    });
  });
});
