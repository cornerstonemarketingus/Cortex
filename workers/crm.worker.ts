import { createReminderWorker, createWorkflowWorker } from '../src/crm/core/queue';
import { NurtureService } from '../src/crm/modules/nurture';
import IORedis from 'ioredis';

const nurtureService = new NurtureService();

let workflowWorker: ReturnType<typeof createWorkflowWorker> | null = null;
let reminderWorker: ReturnType<typeof createReminderWorker> | null = null;

async function verifyRedisConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new IORedis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });
  client.on('error', () => {
    // The startup preflight reports connection failures through the thrown error below.
  });

  try {
    await client.connect();
    await client.ping();
  } catch (error) {
    if (error instanceof Error && error.message === 'Connection is closed.') {
      throw new Error(`Unable to connect to ${redisUrl}`);
    }

    throw error;
  } finally {
    client.disconnect();
  }
}

async function main() {
  try {
    await verifyRedisConnection();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[crm-worker] Redis is unavailable. Start Redis and retry.');
    console.error(`[crm-worker] ${message}`);
    process.exit(1);
  }

  console.log('[crm-worker] starting workers: crm-workflow-events, crm-reminders');

  workflowWorker = createWorkflowWorker(async (job) => {
    const { triggerType, leadId, payload } = job.data;
    console.log(`[crm-worker] workflow job ${job.id}: trigger=${triggerType} lead=${leadId || 'n/a'}`);

    return nurtureService.triggerWorkflows({
      triggerType,
      leadId,
      context: payload,
    });
  });

  reminderWorker = createReminderWorker(async (job) => {
    const { reminderId } = job.data;
    console.log(`[crm-worker] reminder job ${job.id}: reminderId=${reminderId}`);

    return nurtureService.processReminder(reminderId);
  });

  workflowWorker.on('completed', (job) => {
    console.log(`[crm-worker] workflow job ${job.id} completed`);
  });

  workflowWorker.on('failed', (job, error) => {
    console.error(`[crm-worker] workflow job ${job?.id || 'unknown'} failed: ${error.message}`);
  });

  reminderWorker.on('completed', (job) => {
    console.log(`[crm-worker] reminder job ${job.id} completed`);
  });

  reminderWorker.on('failed', (job, error) => {
    console.error(`[crm-worker] reminder job ${job?.id || 'unknown'} failed: ${error.message}`);
  });
}

async function shutdown(signal: string) {
  console.log(`[crm-worker] received ${signal}, shutting down...`);

  if (workflowWorker || reminderWorker) {
    await Promise.allSettled([
      workflowWorker?.close(),
      reminderWorker?.close(),
    ]);
  }

  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void main();
