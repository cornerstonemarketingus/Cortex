import { readJson } from '@/src/crm/core/api';
import { requireCrmAdmin, requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, parseOptionalString, parseRecord, withApiHandler } from '@/src/crm/core/http';
import { NurtureService, type WorkflowDefinition } from '@/src/crm/modules/nurture';

const nurtureService = new NurtureService();

type CreateWorkflowBody = {
  name?: string;
  definition?: unknown;
};

function normalizeDefinition(value: unknown): WorkflowDefinition | null {
  const definition = parseRecord(value) as Partial<WorkflowDefinition>;

  const trigger = parseOptionalString(definition.trigger);
  if (!trigger) {
    return null;
  }

  const conditions = Array.isArray(definition.conditions)
    ? definition.conditions.filter((item) => item && typeof item === 'object')
    : [];

  const actions = Array.isArray(definition.actions)
    ? definition.actions.filter((item) => item && typeof item === 'object')
    : [];

  return {
    trigger,
    conditions: conditions as WorkflowDefinition['conditions'],
    actions: actions as WorkflowDefinition['actions'],
  };
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const workflows = await nurtureService.listWorkflows();
    return jsonResponse({ workflows, count: workflows.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAdmin(request);

    const body = await readJson<CreateWorkflowBody>(request);
    const name = parseOptionalString(body.name);
    const definition = normalizeDefinition(body.definition);

    if (!name || !definition) {
      return jsonResponse({ error: 'name and valid definition are required' }, 400);
    }

    const workflow = await nurtureService.createWorkflow(name, definition);
    return jsonResponse({ workflow }, 201);
  });
}
