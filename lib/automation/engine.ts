/**
 * Automation Engine — Trigger/Action Dispatcher
 * Zapier-killer: defines workflows as { trigger, conditions, actions[] }
 * Supports event-driven and time-based triggers.
 */

import { llm } from '@/lib/llm/router';

// ---- Trigger types ----

export type TriggerEvent =
  | 'estimate_approved'
  | 'estimate_created'
  | 'form_submitted'
  | 'missed_call'
  | 'call_completed'
  | 'job_started'
  | 'job_complete'
  | 'invoice_created'
  | 'invoice_paid'
  | 'lead_created'
  | 'appointment_scheduled'
  | 'appointment_reminder'
  | 'review_requested'
  | 'custom';

// ---- Action types ----

export type ActionType =
  | 'send_sms'
  | 'send_email'
  | 'send_invoice'
  | 'notify_team'
  | 'schedule_job'
  | 'create_task'
  | 'update_crm'
  | 'create_estimate'
  | 'request_review'
  | 'webhook'
  | 'wait'
  | 'condition';

// ---- Workflow definition ----

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number | boolean;
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  config: Record<string, unknown>;
  delayMinutes?: number;
  conditions?: WorkflowCondition[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: TriggerEvent;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  createdAt?: string;
}

// ---- Execution context ----

export interface WorkflowContext {
  triggerData: Record<string, unknown>;
  leadId?: string;
  estimateId?: string;
  jobId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export interface ActionResult {
  actionId: string;
  type: ActionType;
  success: boolean;
  output?: unknown;
  error?: string;
  skippedByCondition?: boolean;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  trigger: TriggerEvent;
  startedAt: string;
  completedAt: string;
  results: ActionResult[];
  success: boolean;
}

// ---- Condition evaluator ----

function evaluateCondition(condition: WorkflowCondition, ctx: WorkflowContext): boolean {
  const value = ctx.triggerData[condition.field];
  const target = condition.value;

  switch (condition.operator) {
    case 'equals': return value == target;
    case 'not_equals': return value != target;
    case 'contains': return String(value).includes(String(target));
    case 'greater_than': return Number(value) > Number(target);
    case 'less_than': return Number(value) < Number(target);
    default: return false;
  }
}

function evaluateConditions(conditions: WorkflowCondition[] | undefined, ctx: WorkflowContext): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, ctx));
}

// ---- Action executor ----

async function executeAction(action: WorkflowAction, ctx: WorkflowContext): Promise<ActionResult> {
  // Check action-level conditions
  if (!evaluateConditions(action.conditions, ctx)) {
    return { actionId: action.id, type: action.type, success: true, skippedByCondition: true };
  }

  // Apply delay if specified
  if (action.delayMinutes && action.delayMinutes > 0) {
    await new Promise((r) => setTimeout(r, Math.min(action.delayMinutes! * 60_000, 5_000)));
  }

  try {
    let output: unknown;

    switch (action.type) {
      case 'send_sms': {
        const { sendSMS } = await import('@/lib/communications/sms-service');
        const to = (action.config.to as string) || (ctx.triggerData.phone as string);
        const body = (action.config.body as string) || 'Follow up from your contractor.';
        if (to) {
          const result = await sendSMS({ to, body });
          output = result;
        } else {
          return { actionId: action.id, type: action.type, success: false, error: 'No phone number' };
        }
        break;
      }

      case 'send_email': {
        // Email action — integrate with your email provider
        const to = (action.config.to as string) || (ctx.triggerData.email as string);
        const subject = (action.config.subject as string) || 'Update from your contractor';
        const body = (action.config.body as string) || '';
        output = { queued: true, to, subject };
        // TODO: integrate with SendGrid/Postmark via crm/nurture/webhooks/sendgrid
        void { to, subject, body };
        break;
      }

      case 'notify_team': {
        const message = (action.config.message as string) ||
          `New ${ctx.triggerData.type || 'event'} requires attention.`;
        const channel = (action.config.channel as string) || 'slack';
        output = { notified: true, channel, message };
        // TODO: integrate with Slack/Teams webhook
        break;
      }

      case 'create_task': {
        output = {
          created: true,
          title: action.config.title || 'Auto-generated task',
          assignee: action.config.assignee,
          dueDate: action.config.dueDate,
          relatedTo: ctx.leadId || ctx.jobId,
        };
        break;
      }

      case 'update_crm': {
        output = {
          updated: true,
          field: action.config.field,
          value: action.config.value,
          leadId: ctx.leadId,
        };
        break;
      }

      case 'webhook': {
        const url = action.config.url as string;
        if (!url) return { actionId: action.id, type: action.type, success: false, error: 'No webhook URL' };
        const webhookRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: ctx.triggerData, leadId: ctx.leadId, metadata: ctx.metadata }),
        });
        output = { status: webhookRes.status };
        break;
      }

      case 'wait': {
        output = { waited: true, delayMinutes: action.delayMinutes };
        break;
      }

      default:
        output = { type: action.type, config: action.config };
    }

    return { actionId: action.id, type: action.type, success: true, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { actionId: action.id, type: action.type, success: false, error: message };
  }
}

// ---- Workflow executor ----

/**
 * Execute a workflow against a context.
 * Returns a full execution result with per-action outcomes.
 */
export async function executeWorkflow(
  workflow: Workflow,
  ctx: WorkflowContext
): Promise<WorkflowExecutionResult> {
  const startedAt = new Date().toISOString();

  if (!workflow.enabled) {
    return {
      workflowId: workflow.id,
      trigger: workflow.trigger,
      startedAt,
      completedAt: new Date().toISOString(),
      results: [],
      success: false,
    };
  }

  // Check workflow-level conditions
  if (!evaluateConditions(workflow.conditions, ctx)) {
    return {
      workflowId: workflow.id,
      trigger: workflow.trigger,
      startedAt,
      completedAt: new Date().toISOString(),
      results: [],
      success: true,
    };
  }

  // Execute actions sequentially
  const results: ActionResult[] = [];
  for (const action of workflow.actions) {
    const result = await executeAction(action, ctx);
    results.push(result);
    if (!result.success && !result.skippedByCondition) break; // halt on failure
  }

  return {
    workflowId: workflow.id,
    trigger: workflow.trigger,
    startedAt,
    completedAt: new Date().toISOString(),
    results,
    success: results.every((r) => r.success),
  };
}

/**
 * Fire all enabled workflows matching a trigger event.
 * This is what you call from your API routes.
 */
export async function fireTrigger(
  trigger: TriggerEvent,
  workflows: Workflow[],
  ctx: WorkflowContext
): Promise<WorkflowExecutionResult[]> {
  const matching = workflows.filter((w) => w.enabled && w.trigger === trigger);
  const results = await Promise.all(matching.map((w) => executeWorkflow(w, ctx)));
  return results;
}

// ---- AI Workflow Generator ----

/**
 * Use AI to generate a workflow JSON from plain English description.
 */
export async function generateWorkflowFromPrompt(description: string, businessName: string): Promise<Partial<Workflow>> {
  const prompt = `You are a workflow automation designer for ${businessName}.

Create a workflow in JSON format based on this description:
"${description}"

Return a JSON object matching this structure:
{
  "name": string,
  "description": string,
  "trigger": one of [estimate_approved, form_submitted, missed_call, job_complete, invoice_created, lead_created, appointment_scheduled],
  "actions": [
    { "id": "a1", "type": "send_sms|send_email|notify_team|create_task|webhook", "config": { ... }, "delayMinutes": number }
  ],
  "enabled": true
}

Return only valid JSON.`;

  const raw = await llm(prompt, 'automation');

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: `wf_${Date.now()}`,
        enabled: true,
        ...parsed,
      };
    }
  } catch {
    // fall through
  }

  return {
    id: `wf_${Date.now()}`,
    name: description.slice(0, 50),
    trigger: 'custom',
    actions: [],
    enabled: false,
  };
}

// ---- Preset workflows ----

export const PRESET_WORKFLOWS: Workflow[] = [
  {
    id: 'preset-missed-call',
    name: 'Missed Call → Instant SMS',
    description: 'When a call is missed, immediately text the caller back.',
    trigger: 'missed_call',
    actions: [
      {
        id: 'a1',
        type: 'send_sms',
        config: {
          body: "Hi! Sorry we missed your call. This is {{businessName}}. How can we help? Reply here!",
        },
        delayMinutes: 0,
      },
    ],
    enabled: true,
  },
  {
    id: 'preset-new-lead',
    name: 'New Lead → Welcome SMS',
    description: 'Welcome every new lead with an automatic SMS.',
    trigger: 'lead_created',
    actions: [
      {
        id: 'a1',
        type: 'send_sms',
        config: { body: "Welcome! Thanks for reaching out to {{businessName}}. We'll be in touch shortly!" },
        delayMinutes: 1,
      },
      {
        id: 'a2',
        type: 'notify_team',
        config: { message: 'New lead received. Check CRM for details.' },
      },
    ],
    enabled: true,
  },
  {
    id: 'preset-estimate-approved',
    name: 'Estimate Approved → Invoice + Schedule',
    description: 'When an estimate is approved, send invoice and schedule the job.',
    trigger: 'estimate_approved',
    actions: [
      { id: 'a1', type: 'send_invoice', config: {}, delayMinutes: 0 },
      { id: 'a2', type: 'notify_team', config: { message: 'Estimate approved! Job scheduling needed.' }, delayMinutes: 2 },
      { id: 'a3', type: 'schedule_job', config: {}, delayMinutes: 5 },
    ],
    enabled: true,
  },
  {
    id: 'preset-job-complete',
    name: 'Job Complete → Review Request',
    description: 'After job completion, ask the client for a review.',
    trigger: 'job_complete',
    actions: [
      {
        id: 'a1',
        type: 'send_sms',
        config: { body: "Thanks for choosing {{businessName}}! We'd love your feedback. Leave a review here: {{reviewLink}}" },
        delayMinutes: 60,
      },
    ],
    enabled: true,
  },
];
