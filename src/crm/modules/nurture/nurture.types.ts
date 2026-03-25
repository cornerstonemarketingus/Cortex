import type { ChannelType } from '@/generated/crm-client';

export type WorkflowConditionOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'in'
  | 'exists';

export type WorkflowCondition = {
  field: string;
  operator: WorkflowConditionOperator;
  value?: unknown;
};

export type WorkflowActionType =
  | 'send_sms'
  | 'send_email'
  | 'send_chat'
  | 'set_pipeline_stage'
  | 'enqueue_reminder'
  | 'assign_owner'
  | 'create_note';

export type WorkflowAction = {
  type: WorkflowActionType;
  payload: Record<string, unknown>;
};

export type WorkflowDefinition = {
  trigger: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
};

export type TriggerWorkflowInput = {
  triggerType: string;
  leadId?: string;
  context: Record<string, unknown>;
};

export type SendMessageInput = {
  leadId: string;
  channel: ChannelType;
  content: string;
  subject?: string;
  source?: string;
  tone?: 'friendly' | 'sales' | 'support';
  autoReply?: boolean;
};

export type AppointmentInput = {
  leadId: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  notes?: string;
};
