import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseLimit,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import { NurtureService } from '@/src/crm/modules/nurture';

const nurtureService = new NurtureService();

type CreateAppointmentBody = {
  leadId?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  notes?: string;
};

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const limit = parseLimit(request, 100, 1, 300);
    const appointments = await nurtureService.listAppointments(limit);
    return jsonResponse({ appointments, count: appointments.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<CreateAppointmentBody>(request);
    const leadId = parseOptionalString(body.leadId);
    const startsAt = parseOptionalString(body.startsAt);
    const endsAt = parseOptionalString(body.endsAt);

    if (!leadId || !startsAt || !endsAt) {
      return jsonResponse({ error: 'leadId, startsAt, and endsAt are required' }, 400);
    }

    const appointment = await nurtureService.createAppointment({
      leadId,
      startsAt,
      endsAt,
      location: parseOptionalString(body.location),
      notes: parseOptionalString(body.notes),
    });

    return jsonResponse({ appointment }, 201);
  });
}
