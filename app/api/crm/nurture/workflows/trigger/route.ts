import { readJson } from '@/src/crm/core/api';
import { requireCrmAuth } from '@/src/crm/core/auth';
import {
  jsonResponse,
  parseBoolean,
  parseOptionalString,
  parseRecord,
  withApiHandler,
} from '@/src/crm/core/http';
import { enqueueWorkflowEvent } from '@/src/crm/core/queue';
import { NurtureService } from '@/src/crm/modules/nurture';

const nurtureService = new NurtureService();

type TriggerWorkflowBody = {
  triggerType?: string;
  leadId?: string;
  context?: unknown;
  async?: unknown;
};

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);

    const body = await readJson<TriggerWorkflowBody>(request);
    const triggerType = parseOptionalString(body.triggerType);

    if (!triggerType) {
      return jsonResponse({ error: 'triggerType is required' }, 400);
    }

    const context = parseRecord(body.context);
    const leadId = parseOptionalString(body.leadId);

    if (parseBoolean(body.async, false)) {
      const job = await enqueueWorkflowEvent({
        triggerType,
        leadId,
        payload: context,
      });

      return jsonResponse({
        queued: true,
        queue: 'crm-workflow-events',
        jobId: job.id,
      }, 202);
    }

    const result = await nurtureService.triggerWorkflows({
      triggerType,
      leadId,
      context,
    });

    return jsonResponse({ result });
  });
}
