import { createAgentWorker } from '../lib/queue';
import { runAgentInSandbox } from '../lib/sandbox';

console.log('Worker started for queue: agent-tasks');

const worker = createAgentWorker(async (job) => {
    const { 
        agent, 
        task, 
        mode = 'propose', 
        dryRun = true, 
        cwd = process.cwd(), 
    } = job.data;

    console.log(`Processing job ${job.id}: ${agent} -> ${task.substring(0, 50)}... [Sandbox: ${process.env.CORTEX_SANDBOX_MODE || 'local'}]`);

    try {
        const result = await runAgentInSandbox({ 
            agent, 
            task, 
            mode, 
            dryRun, 
            cwd 
        });
        return result;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Job ${job.id} failed: ${message}`);
        throw err;
    }
});

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id || 'unknown'} failed with ${err.message}`);
});
