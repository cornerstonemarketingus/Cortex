import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TASK_QUEUE_PATH = path.join(process.cwd(), 'apps', 'current_app', 'tasks', 'task_queue.json');

type CtoTask = {
  id: string;
  type: string;
  description: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
};

function parseTaskQueue(content: string): CtoTask[] {
  const parsed: unknown = JSON.parse(content);
  return Array.isArray(parsed) ? (parsed as CtoTask[]) : [];
}

function parseTaskBody(body: unknown): CtoTask | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const candidate = body as Partial<CtoTask>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.type !== 'string' ||
    typeof candidate.description !== 'string'
  ) {
    return null;
  }

  return {
    ...candidate,
    id: candidate.id,
    type: candidate.type,
    description: candidate.description,
  };
}

// Ensure directory exists
async function ensureQueue() {
  try {
    await fs.access(TASK_QUEUE_PATH);
  } catch {
    await fs.mkdir(path.dirname(TASK_QUEUE_PATH), { recursive: true });
    await fs.writeFile(TASK_QUEUE_PATH, '[]', 'utf-8');
  }
}

export async function GET() {
  try {
    await ensureQueue();
    const content = await fs.readFile(TASK_QUEUE_PATH, 'utf-8');
    const tasks = parseTaskQueue(content);
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read task queue' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureQueue();
    const body = parseTaskBody(await req.json());
    
    // Validate minimum task structure
    if (!body) {
      return NextResponse.json({ error: 'Missing required fields (id, type, description)' }, { status: 400 });
    }

    const content = await fs.readFile(TASK_QUEUE_PATH, 'utf-8');
    const tasks = parseTaskQueue(content);
    
    // Simple deduplication by ID
    if (tasks.find((t) => t.id === body.id)) {
      return NextResponse.json({ error: 'Task ID already exists' }, { status: 400 });
    }

    tasks.push({
      ...body,
      status: 'pending', // Force status to pending for new tasks
      created_at: new Date().toISOString()
    });

    await fs.writeFile(TASK_QUEUE_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
    
    return NextResponse.json({ success: true, task: body });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to add task' }, { status: 500 });
  }
}
