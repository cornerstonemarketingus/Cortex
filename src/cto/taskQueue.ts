import fs from 'fs/promises';
import path from 'path';

export type CtoTaskRecord = {
  id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export type CtoTaskDraft = {
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
};

const TASK_QUEUE_PATH = path.join(process.cwd(), 'apps', 'current_app', 'tasks', 'task_queue.json');

function parseTaskQueue(content: string): CtoTaskRecord[] {
  const parsed: unknown = JSON.parse(content);
  return Array.isArray(parsed) ? (parsed as CtoTaskRecord[]) : [];
}

function createTaskId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}`;
}

export async function ensureTaskQueue() {
  try {
    await fs.access(TASK_QUEUE_PATH);
  } catch {
    await fs.mkdir(path.dirname(TASK_QUEUE_PATH), { recursive: true });
    await fs.writeFile(TASK_QUEUE_PATH, '[]', 'utf-8');
  }
}

export async function readTaskQueue() {
  await ensureTaskQueue();
  const content = await fs.readFile(TASK_QUEUE_PATH, 'utf-8');
  return parseTaskQueue(content);
}

export async function appendTaskDrafts(
  drafts: CtoTaskDraft[],
  options?: {
    dedupeByDescription?: boolean;
    idPrefix?: string;
  }
) {
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return {
      added: [] as CtoTaskRecord[],
      total: (await readTaskQueue()).length,
    };
  }

  const existing = await readTaskQueue();
  const existingDescriptions = new Set(existing.map((task) => task.description.trim().toLowerCase()));

  const added: CtoTaskRecord[] = [];
  for (const draft of drafts) {
    const description = draft.description.trim();
    if (!description) continue;

    if (options?.dedupeByDescription && existingDescriptions.has(description.toLowerCase())) {
      continue;
    }

    const record: CtoTaskRecord = {
      id: createTaskId(options?.idPrefix || 'task'),
      type: draft.type || 'feature',
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
      metadata: draft.metadata,
    };

    existing.push(record);
    existingDescriptions.add(description.toLowerCase());
    added.push(record);
  }

  await fs.writeFile(TASK_QUEUE_PATH, JSON.stringify(existing, null, 2), 'utf-8');

  return {
    added,
    total: existing.length,
  };
}
