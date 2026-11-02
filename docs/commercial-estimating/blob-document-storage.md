# Blob-backed document storage

The task M1 named as "required before production use". Uploaded drawings now go
to an S3-compatible blob store, and a deployment that cannot keep them refuses
to accept them.

---

## The problem this closes

M1 stored originals on the filesystem. On Vercel's serverless filesystem that
is total data loss: the bytes do not survive the request. M1 surfaced the
condition (`documentStorageIsDurable()` returned `false`) but still accepted the
upload, created the rows and metered the pages — a customer would have received
a processed estimate and a project whose drawings had evaporated.

Two changes fix that:

1. **An S3 store**, used whenever it is configured.
2. **A refusal**, when it is not. An upload onto storage that cannot keep it now
   fails with `503 STORAGE_NOT_DURABLE` *before* the first byte is written, the
   first row is created, or a page is metered.

---

## Configuration

| Variable | Purpose |
| --- | --- |
| `COMMERCIAL_S3_BUCKET` | Bucket name |
| `COMMERCIAL_S3_ACCESS_KEY_ID` | Access key |
| `COMMERCIAL_S3_SECRET_ACCESS_KEY` | Secret key |
| `COMMERCIAL_S3_ENDPOINT` | Required for R2, MinIO, B2; omit for AWS S3 |
| `COMMERCIAL_S3_REGION` | Defaults to `auto` with an endpoint, `us-east-1` without |
| `COMMERCIAL_S3_SESSION_TOKEN` | For temporary credentials |
| `COMMERCIAL_S3_FORCE_PATH_STYLE` | `1`/`0`; defaults to path style when an endpoint is set |
| `COMMERCIAL_S3_PREFIX` | Optional key prefix, to share a bucket |
| `COMMERCIAL_S3_TIMEOUT_MS` | Per-request timeout (default 120s) |
| `COMMERCIAL_DOCUMENT_STORE` | `s3` or `filesystem`, to force the choice |
| `COMMERCIAL_DOCUMENT_ROOT` | Filesystem root (default `./.cortex-documents`) |
| `COMMERCIAL_ALLOW_EPHEMERAL_STORAGE` | `1` accepts uploads that will be lost. Demos only. |

Cloudflare R2:

```bash
COMMERCIAL_S3_BUCKET="cortex-documents"
COMMERCIAL_S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
COMMERCIAL_S3_ACCESS_KEY_ID="..."
COMMERCIAL_S3_SECRET_ACCESS_KEY="..."
```

AWS S3:

```bash
COMMERCIAL_S3_BUCKET="cortex-documents"
COMMERCIAL_S3_REGION="us-east-2"
COMMERCIAL_S3_ACCESS_KEY_ID="..."
COMMERCIAL_S3_SECRET_ACCESS_KEY="..."
```

The key needs `PutObject`, `GetObject`, `HeadObject` and `DeleteObject` on that
bucket, and nothing else.

### Selection, and why a half-configuration is fatal

`COMMERCIAL_DOCUMENT_STORE` forces a choice; otherwise the blob store is used
whenever credentials are present. A **partially** configured store — a bucket
with no secret, say — throws on startup instead of falling back to the
filesystem. Falling back would reintroduce exactly the silent data loss this
change exists to prevent, on the deployment whose operator was trying to
configure storage properly.

---

## Why no SDK

`@aws-sdk/client-s3` is a large dependency and a second HTTP stack to add to a
Next.js server bundle for four object operations. SigV4 is a hashing recipe, so
`storage/sigv4.ts` implements it in ~150 lines and `storage/s3-document-store.ts`
uses `fetch`.

The risk in hand-rolling a signature is that it is subtly wrong and every
request 403s against a real bucket. That is addressed directly rather than
hoped about: a test signs the requests this store actually makes with both our
signer and **AWS's own `@smithy/signature-v4`**, and asserts the two
`Authorization` headers are byte-identical. `@smithy/signature-v4` is a
devDependency and ships in no bundle.

---

## What content addressing buys

The key *is* the SHA-256 of the bytes (`org/<orgId>/<ab>/<sha256>`), which makes
three things fall out:

- **Every operation is idempotent.** A retry after a timeout can never corrupt
  anything, so transient 5xx and network failures are retried (3 attempts).
- **A write can be skipped.** `put` on an object that exists is a no-op, so a
  retried customer upload costs nothing.
- **A read can be verified.** `get` re-hashes what came back and raises
  `DocumentIntegrityError` — distinct from "not found" — if it does not match.
  A truncated transfer or a stale object from a cache never reaches the parser
  dressed as the customer's drawing. The filesystem store does this too.

On write the store also sends `x-amz-checksum-sha256`, so the service verifies
the upload at its end and rejects a corrupted one rather than storing it.

---

## Verifying a real deployment

No test can prove *your* bucket, credentials, endpoint and network policy work
together. One command does:

```bash
npm run verify:blob-store
```

It writes a 4KB object under the reserved organization id `storage-selfcheck`,
confirms `exists`, reads it back, checks the digest, deletes it, and exits
non-zero on any failure. It never touches a customer key. **Run it once against
the production bucket before pointing customers at the feature.**

---

## Tests

`npm run test:commercial` — 124 assertions. The storage suites need no
credentials and no network:

- **Signing**: the signing-key derivation matches AWS's documented example; the
  signature is bound to payload, region and day; path segments are encoded
  without eating the slashes; and both request shapes match the AWS signer
  byte-for-byte.
- **The store**, driven against a local HTTP server that speaks enough of the S3
  object API to be honest — it verifies the checksum header on write and serves
  real 404s: round trip, checksum sent, second write skipped, `exists` without a
  body download, missing key, corrupted body, delete idempotence, retry on 5xx,
  give-up with the status, no retry on 403, unsafe-key rejection, prefixing.
- **Configuration**: default filesystem, S3 when configured, explicit override,
  half-configuration throws, unknown name throws, ephemeral refusal, the opt-in,
  and no credential in the diagnostics payload.
- **The refusal, against a real database**: an upload onto a store declared
  ephemeral fails with `503 STORAGE_NOT_DURABLE` and leaves zero `Document`,
  `DocumentRevision` and `ProcessingJob` rows — the proof that nothing is
  written or metered before storage is known to be good.

What the suite does **not** prove is that a particular vendor accepts our
requests end to end. That is what `npm run verify:blob-store` is for, and why
this document asks for one live round trip before production use.

---

## Still open

1. **Extraction is still inline**, not queued. Unchanged by this work, and still
   the next task: a 250-sheet package does not belong in one HTTP request.
2. **No lifecycle policy.** Nothing deletes anything; an orphaned blob from a
   failed ingest stays forever. Deliberate for now — the recoverable failure is
   the one to prefer — but a reaper that drops blobs with no revision row after
   N days is worth having.
3. **No server-side encryption header.** Bucket-level encryption (SSE-S3 on AWS,
   on by default on R2) covers this; per-object `x-amz-server-side-encryption`
   is not sent.
4. **Reads are whole-object.** Fine for drawings up to a few hundred MB; a range
   request API would be needed to stream a page out of a very large package.
