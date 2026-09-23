import { NextRequest } from 'next/server';

import { jsonResponse, withApiHandler } from '@/src/crm/core/http';
import { resolveRequestScope } from '@/src/commercial-estimating/api/auth';
import { getProject } from '@/src/commercial-estimating/data/projects';
import { getProjectDrawingRegister } from '@/src/commercial-estimating/data/documents';

export const runtime = 'nodejs';

/**
 * A project and its persisted drawing register.
 *
 * This is the endpoint that makes M1 worth having: the register comes from the
 * database, so it is the same days after the upload, in a different process,
 * without the original bytes being re-sent.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  return withApiHandler(async () => {
    const { projectId } = await context.params;
    const { db, scope } = await resolveRequestScope(request);

    const project = await getProject(db, scope, projectId);
    const sheets = await getProjectDrawingRegister(db, scope, projectId);

    const measurementReadiness = sheets.reduce<Record<string, number>>((counts, sheet) => {
      counts[sheet.measurementSuitability] = (counts[sheet.measurementSuitability] ?? 0) + 1;
      return counts;
    }, {});

    return jsonResponse({
      project,
      sheets,
      measurementReadiness,
      // Unchanged from PDF Intelligence V1: reading a drawing is not measuring it.
      supportedValidationStatus: 'scale_unverified',
      disclaimer:
        'This register records what the drawings say. No construction quantity has been measured from them, and nothing here may be issued as a verified measurement.',
    });
  });
}
