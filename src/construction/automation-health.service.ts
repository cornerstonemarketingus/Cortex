import { WorkflowExecutionStatus } from '@/generated/crm-client';
import { crmDb } from '@/src/crm/core/crmDb';
import { getReminderQueue, getWorkflowQueue } from '@/src/crm/core/queue';
import { ApiError } from '@/src/crm/core/api';

type HealthLevel = 'healthy' | 'warning' | 'blocked';

type QueueHealth = {
  name: string;
  reachable: boolean;
  waiting: number;
  active: number;
  failed: number;
};

export type AutomationHealthSnapshot = {
  level: HealthLevel;
  generatedAt: string;
  providers: {
    twilioConfigured: boolean;
    sendgridConfigured: boolean;
    openAiConfigured: boolean;
  };
  queues: {
    workflow: QueueHealth;
    reminder: QueueHealth;
  };
  metrics: {
    outboundLastHour: number;
    failedDeliveryLastHour: number;
    workflowFailuresLastHour: number;
    reminderBacklog: number;
    avgReplyLatencyMsLastHour: number;
  };
  alerts: string[];
};

function hasValue(name: string) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function boolTwilioConfigured() {
  return (
    hasValue('TWILIO_ACCOUNT_SID') &&
    hasValue('TWILIO_AUTH_TOKEN') &&
    (hasValue('TWILIO_MESSAGING_SERVICE_SID') || hasValue('TWILIO_FROM_NUMBER'))
  );
}

function boolSendgridConfigured() {
  return hasValue('SENDGRID_API_KEY') && hasValue('SENDGRID_FROM_EMAIL');
}

function parseDeliveryStatus(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const delivery =
    record.delivery && typeof record.delivery === 'object'
      ? (record.delivery as Record<string, unknown>)
      : null;
  if (!delivery) return null;
  const status = delivery.status;
  return typeof status === 'string' ? status : null;
}

function numberFromUnknown(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

async function getQueueHealth(name: 'workflow' | 'reminder'): Promise<QueueHealth> {
  try {
    const queue = name === 'workflow' ? getWorkflowQueue() : getReminderQueue();
    const [waiting, active, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getFailedCount(),
    ]);

    return {
      name,
      reachable: true,
      waiting,
      active,
      failed,
    };
  } catch {
    return {
      name,
      reachable: false,
      waiting: 0,
      active: 0,
      failed: 0,
    };
  }
}

export async function getAutomationHealthSnapshot(): Promise<AutomationHealthSnapshot> {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);

  const [workflowQueue, reminderQueue, outboundInteractions, workflowFailures, reminderBacklog, recentInbound, recentOutbound] =
    await Promise.all([
      getQueueHealth('workflow'),
      getQueueHealth('reminder'),
      crmDb.interaction.findMany({
        where: {
          type: 'outbound_message',
          createdAt: {
            gte: oneHourAgo,
          },
        },
        select: {
          payload: true,
        },
        take: 400,
      }),
      crmDb.workflowExecution.count({
        where: {
          status: WorkflowExecutionStatus.FAILED,
          createdAt: {
            gte: oneHourAgo,
          },
        },
      }),
      crmDb.reminder.count({
        where: {
          sentAt: null,
          sendAt: {
            lte: new Date(),
          },
        },
      }),
      crmDb.conversationMessage.findMany({
        where: {
          direction: 'INBOUND',
          createdAt: {
            gte: oneHourAgo,
          },
        },
        select: {
          createdAt: true,
          conversationId: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 300,
      }),
      crmDb.conversationMessage.findMany({
        where: {
          direction: 'OUTBOUND',
          createdAt: {
            gte: oneHourAgo,
          },
        },
        select: {
          createdAt: true,
          conversationId: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 600,
      }),
    ]);

  let failedDeliveryLastHour = 0;
  for (const interaction of outboundInteractions) {
    const status = parseDeliveryStatus(interaction.payload);
    if (status === 'failed') {
      failedDeliveryLastHour += 1;
    }
  }

  const outboundByConversation = new Map<string, Date[]>();
  for (const out of recentOutbound) {
    const existing = outboundByConversation.get(out.conversationId) || [];
    existing.push(out.createdAt);
    outboundByConversation.set(out.conversationId, existing);
  }

  let latencySamples = 0;
  let latencyTotalMs = 0;

  for (const inbound of recentInbound) {
    const outs = outboundByConversation.get(inbound.conversationId) || [];
    const firstAfter = outs.find((item) => item.getTime() >= inbound.createdAt.getTime());
    if (!firstAfter) continue;
    latencySamples += 1;
    latencyTotalMs += Math.max(0, firstAfter.getTime() - inbound.createdAt.getTime());
  }

  const avgReplyLatencyMsLastHour =
    latencySamples > 0 ? Math.round(latencyTotalMs / latencySamples) : 0;

  const providers = {
    twilioConfigured: boolTwilioConfigured(),
    sendgridConfigured: boolSendgridConfigured(),
    openAiConfigured: hasValue('OPENAI_API_KEY'),
  };

  const alerts: string[] = [];

  if (!providers.openAiConfigured) {
    alerts.push('OPENAI_API_KEY is missing. AI chat responder and AI drafting can fail.');
  }

  if (!providers.twilioConfigured && !providers.sendgridConfigured) {
    alerts.push('No outbound provider configured (Twilio/SendGrid). Lead replies cannot be delivered.');
  }

  if (!workflowQueue.reachable || !reminderQueue.reachable) {
    alerts.push('Redis queue is unreachable. Workflow and reminder jobs will not execute reliably.');
  }

  if (workflowFailures > 20) {
    alerts.push(`Workflow failures in last hour are high (${workflowFailures}).`);
  }

  if (reminderBacklog > 100) {
    alerts.push(`Reminder backlog is high (${reminderBacklog}).`);
  }

  if (failedDeliveryLastHour > 15) {
    alerts.push(`Failed deliveries in last hour are elevated (${failedDeliveryLastHour}).`);
  }

  const critical =
    !providers.openAiConfigured ||
    (!providers.twilioConfigured && !providers.sendgridConfigured) ||
    !workflowQueue.reachable ||
    !reminderQueue.reachable;

  const warning =
    workflowFailures > 5 ||
    reminderBacklog > 30 ||
    failedDeliveryLastHour > 5 ||
    numberFromUnknown(avgReplyLatencyMsLastHour) > 10000;

  const level: HealthLevel = critical ? 'blocked' : warning ? 'warning' : 'healthy';

  return {
    level,
    generatedAt: new Date().toISOString(),
    providers,
    queues: {
      workflow: workflowQueue,
      reminder: reminderQueue,
    },
    metrics: {
      outboundLastHour: outboundInteractions.length,
      failedDeliveryLastHour,
      workflowFailuresLastHour: workflowFailures,
      reminderBacklog,
      avgReplyLatencyMsLastHour,
    },
    alerts,
  };
}

export async function enforceAutomationHealth() {
  const snapshot = await getAutomationHealthSnapshot();
  if (snapshot.level === 'blocked') {
    throw new ApiError(
      503,
      'Automation execution blocked due to unhealthy system dependencies. Resolve alerts in Automations dashboard.',
      'AUTOMATION_HEALTH_BLOCKED',
      snapshot
    );
  }
  return snapshot;
}
