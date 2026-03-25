import { NextRequest, NextResponse } from 'next/server';
import { getAgentQueue } from '@/lib/queue';

// GET /api/jobs/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    if (!id) {
        return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    try {
        const agentQueue = getAgentQueue();
        const job = await agentQueue.getJob(id);

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const state = await job.getState();
        const result = job.returnvalue;
        const failedReason = job.failedReason;

        return NextResponse.json({
            id: job.id,
            state,
            result,
            failedReason,
            progress: job.progress,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch job status';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
