import { NextRequest, NextResponse } from 'next/server';
import { getAgentQueue } from '@/lib/queue';
import { ensureWorkspace } from '@/lib/workspaces';

type CreateJobBody = {
    agent?: string;
    task?: string;
    mode?: string;
    dryRun?: boolean;
    userId?: string;
    projectId?: string;
};

// POST /api/jobs
// Payload: { agent, task, mode, dryRun, userId, projectId }
export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as CreateJobBody;
        const { agent, task, mode, dryRun, userId = 'default-user', projectId = 'default-project' } = body;

        if (!agent || !task) {
            return NextResponse.json({ error: "Missing agent or task" }, { status: 400 });
        }

        // Ensure workspace exists
        const cwd = await ensureWorkspace(userId, projectId);

        // Add to queue
        const agentQueue = getAgentQueue();
        const job = await agentQueue.add('run-agent', {
            agent,
            task,
            mode,
            dryRun,
            cwd,
        });

        return NextResponse.json({ 
            jobId: job.id, 
            status: "queued",
            workspace: cwd 
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to enqueue job';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
