import { Queue, Worker, type JobsOptions, type Job } from 'bullmq';
import IORedis from 'ioredis';

export type WorkflowEventJobData = {
  triggerType: string;
  leadId?: string;
  payload: Record<string, unknown>;
};

export type ReminderJobData = {
  reminderId: string;
  leadId: string;
  channel: 'SMS' | 'EMAIL' | 'CHAT';
  payload: Record<string, unknown>;
};

let crmRedis: IORedis | null = null;
let workflowQueue: Queue<WorkflowEventJobData> | null = null;
let reminderQueue: Queue<ReminderJobData> | null = null;

type WorkflowConnection = NonNullable<ConstructorParameters<typeof Queue<WorkflowEventJobData>>[1]>['connection'];
type ReminderConnection = NonNullable<ConstructorParameters<typeof Queue<ReminderJobData>>[1]>['connection'];

function getRedisConnection() {
  if (!crmRedis) {
    crmRedis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }
  return crmRedis;
}

export function getWorkflowQueue() {
  if (!workflowQueue) {
    workflowQueue = new Queue<WorkflowEventJobData>('crm-workflow-events', {
      connection: getRedisConnection() as unknown as WorkflowConnection,
    });
  }
  return workflowQueue;
}

export function getReminderQueue() {
  if (!reminderQueue) {
    reminderQueue = new Queue<ReminderJobData>('crm-reminders', {
      connection: getRedisConnection() as unknown as ReminderConnection,
    });
  }
  return reminderQueue;
}

export async function enqueueWorkflowEvent(
  data: WorkflowEventJobData,
  options?: JobsOptions
) {
  return getWorkflowQueue().add(`workflow:${data.triggerType}`, data, {
    removeOnComplete: true,
    removeOnFail: 1000,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    ...options,
  });
}

export async function enqueueReminder(
  data: ReminderJobData,
  options?: JobsOptions
) {
  return getReminderQueue().add(`reminder:${data.reminderId}`, data, {
    removeOnComplete: true,
    removeOnFail: 1000,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    ...options,
  });
}

export function createWorkflowWorker(
  processor: (job: Job<WorkflowEventJobData>) => Promise<unknown>
) {
  return new Worker<WorkflowEventJobData>('crm-workflow-events', processor, {
    connection: getRedisConnection() as unknown as WorkflowConnection,
  });
}

export function createReminderWorker(
  processor: (job: Job<ReminderJobData>) => Promise<unknown>
) {
  return new Worker<ReminderJobData>('crm-reminders', processor, {
    connection: getRedisConnection() as unknown as ReminderConnection,
  });
}
