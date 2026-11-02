# M1 — Organizations, Projects and Durable Document Storage

The milestone that turns PDF Intelligence from a request-scoped demo into a
product with state.

Before M1, an uploaded drawing package was parsed in-request and discarded: the
extraction lived in a 15-minute in-process cache and the original bytes were
never written anywhere. A contractor could not reopen yesterday's project. Every
later phase of the platform — measurement, pricing, bid packages, autopilot —
depends on the package still being there, so this had to come first.

---

## What shipped

| Capability | Status |
| --- | --- |
| Organization / membership / role model | Done |
| Projects scoped to an organization | Done |
| Immutable documents with a revision chain | Done |
| Content-addressed document storage | Done (filesystem **and** S3-compatible blob store) |
| Persisted drawing register (`DrawingSheet`) | Done |
| Query-layer tenant isolation | Done |
| Cross-org sharing via explicit access grants | Done |
| Durable processing jobs with idempotency | Done |
| Audit trail | Done |
| Background (queued) extraction | **Not in M1 — next task** |
| Blob-backed document store | Done — see `blob-document-storage.md` |

---

## Where the data lives

A **third** Prisma schema, `prisma/commercial/`, generated to
`generated/commercial-client`, configured by `COMMERCIAL_DATABASE_URL`.

This is deliberate. The repo already had two schemas:

| Schema | Purpose |
| --- | --- |
| `prisma/schema.prisma` | App scaffolding (Bot, Memory, Workspace, BuilderPage) |
| `prisma/crm/schema.prisma` | The CRM: 40+ models of live customer sales data |
| `prisma/commercial/schema.prisma` | **New** — construction estimating |

Construction estimating has no business sharing a client, a migration history or
a blast radius with live CRM customer data. A separate client also means a bug
in estimating code cannot reach a `Lead` or an `Invoice` at all.

### Isolation is by database, not by namespace

`COMMERCIAL_DATABASE_URL` should point at its **own database**. It may live on
the same Postgres instance as the CRM.

A trap worth documenting, because it cost time to find: `?schema=` is a Prisma
**CLI** convention. Prisma 7's driver-adapter runtime does not read it — the
query compiler resolves every table against `public` regardless of the
parameter, of `search_path`, or of libpq `options`. A connection string asking
for a custom schema therefore creates tables the CLI can see and the application
cannot, failing at the first query with `The table public.X does not exist`.

`parseCommercialConnection()` strips the parameter and logs a warning rather
than letting that happen silently.

---

## Tenant isolation

The blueprint requires isolation enforced independently of any AI layer. The
weak version of that is a helper you remember to call. This is the strong
version:

```ts
// An OrgScope is branded — it cannot be constructed from a raw string.
const scope = await resolveOrgScope(db, { organizationId, actor });
// Every repository function requires one.
const projects = await listProjects(db, scope);
```

1. **`OrgScope` is a branded type.** The only constructor is `resolveOrgScope()`,
   which verifies membership against the authenticated subject. An
   `organizationId` from a request body cannot become a scope by itself.
2. **Every query is scoped.** `scopedWhere(scope, where)` merges
   `organizationId` into the filter; every tenant-scoped table is indexed on it.
3. **Reads are re-checked after the fact.** `assertOwnedBy()` turns a filter lost
   in a future refactor into a loud failure instead of a silent cross-tenant read.
4. **Existence is not probeable.** A non-member asking for a real organization
   and a fictional one get byte-identical errors. Another organization's project
   is `404 PROJECT_NOT_FOUND`, never `403` — a `403` would confirm the id exists.
5. **Roles gate writes.** `VIEWER` can read; it cannot create projects or upload.

### Sharing without leaking

`ProjectAccessGrant` lets one organization read another's project — the
mechanism a bid board needs, where one GC package is opened by a hundred
subcontractors. Grants are explicit, level-scoped (`READ_DOCUMENTS` /
`READ_TAKEOFF` / `FULL`) and expirable. A grant never confers write access:
uploading into a project you do not own is `PROJECT_NOT_OWNED` even at `FULL`.

---

## Documents and revisions

Originals are content-addressed by SHA-256 and never overwritten.

- **Identical bytes, same project** → recognised as a duplicate. No second
  document, no reprocessing, no second bill.
- **Different bytes, same file name** → a new `DocumentRevision` that
  `supersedes` the previous one. The earlier drawing stays readable, so an
  estimate measured against revision B remains traceable after revision C lands.
- **Storage keys are machine-generated** (`org/<orgId>/<ab>/<sha256>`), validated
  rather than escaped, and namespaced per organization so identical bytes
  uploaded by two organizations never share a key.

Bytes are written to storage *before* the database row is created: an orphaned
blob is recoverable, a row pointing at nothing is not.

---

## Processing jobs

Every extraction has a `ProcessingJob` keyed on the document revision:

- A revision already extracted returns the recorded result — the parser does not
  re-run and `billablePages` is `0`.
- A **failed** job is not treated as complete, so a retry genuinely retries.
- Status, attempts, timing, warnings and the failure reason are all persisted.

### Known limitation: extraction is inline

M1 runs extraction inside the upload request. That is fine for a handful of
sheets and wrong for a 250-sheet package, and the blueprint says as much ("do
not rely on a single HTTP request").

It is inline rather than queued for one honest reason: the queue infrastructure
(`lib/queue.ts`, bullmq, ioredis) needs a Redis instance, and there was none
available in the environment where this was built. Shipping untested queue code
in the path that owns customer documents is worse than shipping a bounded
inline path that is fully tested.

The durable contract — the job row, its status transitions, its idempotency key
— is already in place, so the handoff is a change of *caller*, not of schema.
That is the next task.

---

## API

All endpoints require a **CRM bearer token**. The subscription cookie used by
the residential estimator is deliberately not accepted: it identifies a billing
email, not an authenticated principal, and trusting it would let any caller
claim any actor. The organization may be supplied by the caller (header
`x-cortex-organization`, body, or the token's `tenantId`) because supplying it
proves nothing — membership is what is checked.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/commercial/projects` | List the organization's projects, plus storage durability |
| `POST /api/commercial/projects` | Create a project |
| `GET /api/commercial/projects/:id` | Project + persisted drawing register |
| `POST /api/commercial/projects/:id/documents` | Upload drawings (multipart), store and extract |

`GET /api/commercial/projects/:id` is the endpoint that demonstrates the point
of M1: the register is read from the database, so it is identical days after the
upload, in a different process, with no bytes re-sent.

Nothing here reports a measured quantity. `supportedValidationStatus` remains
`scale_unverified`, exactly as in PDF Intelligence V1.

---

## Deployment

```bash
# Point at a dedicated database (same instance as the CRM is fine).
COMMERCIAL_DATABASE_URL="postgresql://user:pass@host:5432/cortex_commercial"

npm run db:commercial:push   # create/update tables
npm run build                # generates both Prisma clients, then builds
```

| Variable | Purpose |
| --- | --- |
| `COMMERCIAL_DATABASE_URL` | Commercial estimating database. Unset ⇒ endpoints return `503`, rest of the app unaffected. |
| `COMMERCIAL_DOCUMENT_ROOT` | Filesystem document root (default `./.cortex-documents`) |
| `COMMERCIAL_S3_*` | S3-compatible blob store. Required for any host with an ephemeral filesystem — see [`blob-document-storage.md`](./blob-document-storage.md) |

### Durability is now enforced, not just reported

Document storage was filesystem-backed when M1 shipped, which is total data loss
on Vercel's ephemeral serverless filesystem. That is closed:
`S3DocumentStore` backs any S3-compatible store (R2, AWS S3, MinIO, B2), and a
deployment whose storage cannot survive the request now **refuses** the upload
with `503 STORAGE_NOT_DURABLE` before anything is written or metered, rather
than accepting bytes it is about to lose.

Configuration, the signing cross-check against AWS's own signer, and the
`npm run verify:blob-store` live round trip are documented in
[`blob-document-storage.md`](./blob-document-storage.md).

---

## Testing

```bash
# Integration tests need a real PostgreSQL.
export COMMERCIAL_DATABASE_URL="postgresql://postgres@127.0.0.1:5432/cortex_commercial"
npm run db:commercial:push
npm run test:commercial     # 124 assertions
```

Without `COMMERCIAL_DATABASE_URL` the persistence suites report as **SKIPPED**
(the rest still run). A skipped suite is printed explicitly — a test that
did not run is not a test that passed.

In CI that distinction is enforced rather than trusted: the
`Commercial Estimating Tests` workflow provides a PostgreSQL 16 service
container and sets `REQUIRE_ALL_SUITES=1`, which makes a skipped suite fail the
build. Without that guard a misconfigured service container would quietly turn
20 integration assertions into a green tick.

These are integration tests against a real database, not fakes, on purpose: the
thing M1 must get right is isolation at the query layer, and a fake that returns
whatever the repository asks for cannot prove isolation. Only real rows
belonging to two real organizations can.

Covered: membership gating, non-probeable existence, viewer write refusal,
cross-org list and read isolation, access grants including expiry, upload
refusal on a granted-but-not-owned project, duplicate detection, revision
chaining with the superseded bytes still retrievable, storage key isolation and
traversal rejection, extract → persist → read-back on a fresh scope,
reprocessing convergence, job idempotency and billing, rejection of non-PDFs,
and recovery from a thrown extractor.

---

## What M1 does not do

1. **No queued execution** — extraction is inline (above).
2. **Storage is durable when configured** — and refuses uploads when it is not
   (above). An unconfigured deployment serves reads and refuses writes.
3. **No measurement.** Still no quantities; that is M2.
4. **No unified User model.** `OrganizationMember.userRef` holds whatever
   subject the authenticating token carried. Keeping M1 additive mattered more
   than unifying auth, but the two identity systems (CRM JWT, subscription
   cookie) still need reconciling.
5. **No UI.** API and data layer only.
6. **No org self-service.** Organizations and memberships are created directly
   in the database; there is no signup or invitation flow yet.
7. **Residential estimating is untouched** and still runs on its own path.

---

## Next tasks, in order

1. **Move extraction onto the bullmq worker**, with progress reporting against
   the existing `ProcessingJob` row.
2. **Organization onboarding** — signup, invitations, reconciling `userRef` with
   a real User model.
3. **M2: first real measurements** — room detection, floor area and perimeter as
   `MeasurementRecord`s, closing the scale-verification loop.
