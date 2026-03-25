import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';

type AgentJobData = {
    agent: string;
    task: string;
    mode?: string;
    dryRun?: boolean;
    cwd?: string;
};

type AgentJobResult = unknown;
type AgentQueueConnection = NonNullable<ConstructorParameters<typeof Queue<AgentJobData>>[1]>['connection'];

let connection: IORedis | null = null;
let queue: Queue<AgentJobData, AgentJobResult> | null = null;

function getRedisConnection() {
    if (!connection) {
        connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null,
            lazyConnect: true,
        });
    }
    return connection;
}

export function getAgentQueue() {
    if (!queue) {
        queue = new Queue<AgentJobData, AgentJobResult>('agent-tasks', {
            connection: getRedisConnection() as unknown as AgentQueueConnection,
        });
    }
    return queue;
}

export function createAgentWorker(processor: (job: Job<AgentJobData, AgentJobResult>) => Promise<AgentJobResult>) {
    return new Worker<AgentJobData, AgentJobResult>('agent-tasks', processor, {
        connection: getRedisConnection() as unknown as AgentQueueConnection,
    });
}
