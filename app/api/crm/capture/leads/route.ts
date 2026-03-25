import { ChannelType, LeadSourceType } from '@/generated/crm-client';
import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseEnumValue,
  parseLimit,
  parseOptionalString,
  parseRecord,
  parseStringArray,
  withApiHandler,
} from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';

const captureService = new LeadCaptureService();

type CreateLeadBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  timezone?: string;
  tags?: unknown;
  metadata?: unknown;
  sourceType?: string;
  sourceName?: string;
  campaignName?: string;
  firstMessage?: string;
  firstMessageChannel?: string;
};

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const limit = parseLimit(request, 50, 1, 200);
    const leads = await captureService.listLeads(limit);
    return jsonResponse({ leads, count: leads.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<CreateLeadBody>(request);
    const firstName = parseOptionalString(body.firstName);

    if (!firstName) {
      return jsonResponse({ error: 'firstName is required' }, 400);
    }

    const sourceType = parseEnumValue(body.sourceType, LeadSourceType, LeadSourceType.MANUAL);
    const sourceName = parseOptionalString(body.sourceName) || sourceType.toLowerCase();
    const firstMessageChannel = parseEnumValue(
      body.firstMessageChannel,
      ChannelType,
      ChannelType.CHAT
    );

    const lead = await captureService.createLead({
      firstName,
      lastName: parseOptionalString(body.lastName),
      email: parseOptionalString(body.email),
      phone: parseOptionalString(body.phone),
      company: parseOptionalString(body.company),
      jobTitle: parseOptionalString(body.jobTitle),
      timezone: parseOptionalString(body.timezone),
      tags: parseStringArray(body.tags),
      metadata: parseRecord(body.metadata),
      sourceType,
      sourceName,
      campaignName: parseOptionalString(body.campaignName),
      firstMessage: parseOptionalString(body.firstMessage),
      firstMessageChannel,
    });

    return jsonResponse({ lead }, 201);
  });
}
