import { NextRequest } from 'next/server';

import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { resolveRequestScope } from '@/src/commercial-estimating/api/auth';
import { createProject, listProjects } from '@/src/commercial-estimating/data/projects';
import {
  documentStorageIsDurable,
  getDocumentStore,
} from '@/src/commercial-estimating/storage/document-store';

export const runtime = 'nodejs';

type CreateBody = {
  organizationId?: unknown;
  name?: unknown;
  projectNumber?: unknown;
  clientName?: unknown;
  addressLine?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
};

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const { db, scope } = await resolveRequestScope(request);
    const projects = await listProjects(db, scope);

    return jsonResponse({
      organizationId: scope.organizationId,
      projects,
      storage: {
        kind: getDocumentStore().kind,
        durable: documentStorageIsDurable(),
        // Surfaced rather than hidden: on an ephemeral filesystem, uploaded
        // drawings do not survive, and a customer should not find that out by
        // losing a package.
        warning: documentStorageIsDurable()
          ? null
          : 'Document storage is not durable on this deployment. Configure a persistent volume or blob-backed store before uploading production drawings.',
      },
    });
  });
}

export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const body = await readJson<CreateBody>(request);
    const { db, scope } = await resolveRequestScope(request, { organizationId: body.organizationId });

    const name = parseOptionalString(body.name);
    if (!name) {
      throw new ApiError(400, 'Project name is required.', 'PROJECT_NAME_REQUIRED');
    }

    const project = await createProject(db, scope, {
      name,
      projectNumber: parseOptionalString(body.projectNumber),
      clientName: parseOptionalString(body.clientName),
      addressLine: parseOptionalString(body.addressLine),
      city: parseOptionalString(body.city),
      state: parseOptionalString(body.state),
      postalCode: parseOptionalString(body.postalCode),
    });

    return jsonResponse({ project }, 201);
  });
}
