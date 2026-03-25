import { PipelineStageType } from '@/generated/crm-client';
import { ApiError, readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { crmDb } from '@/src/crm/core/crmDb';
import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';

type UpdateStatusBody = {
  stage?: unknown;
  reason?: unknown;
};

function parseStage(value: unknown): PipelineStageType {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  const options = Object.values(PipelineStageType);
  if (options.includes(raw as PipelineStageType)) {
    return raw as PipelineStageType;
  }
  throw new ApiError(400, `Invalid stage. Use one of: ${options.join(', ')}`, 'INVALID_PIPELINE_STAGE');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const { leadId } = await params;

    const lead = await crmDb.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        stage: true,
        updatedAt: true,
      },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    return jsonResponse({ lead });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  return withApiHandler(async () => {
    const auth = await requireCrmAuth(request);
    const { leadId } = await params;
    const body = await readJson<UpdateStatusBody>(request);

    const stage = parseStage(body.stage);
    const reason = parseOptionalString(body.reason) || 'manual_stage_update';

    const updatedLead = await crmDb.lead.update({
      where: { id: leadId },
      data: { stage },
    });

    await crmDb.interaction.create({
      data: {
        leadId,
        type: 'pipeline_stage_updated',
        payload: {
          stage,
          reason,
          updatedBy: auth.sub,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    return jsonResponse({ lead: updatedLead });
  });
}
