import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

type DeleteBody = {
  email?: string;
  reason?: string;
  confirmText?: string;
  userId?: string;
};

type DeletionTicket = {
  ticketId: string;
  email: string;
  userId?: string;
  reason: string;
  status: 'queued' | 'processing' | 'completed';
  createdAt: string;
};

const STORE_PATH = path.join(process.cwd(), 'apps', 'current_app', 'compliance', 'deletion_requests.json');

function makeTicketId(): string {
  return `del-${Math.random().toString(36).slice(2, 10)}`;
}

async function readStore(): Promise<{ tickets: DeletionTicket[] }> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    return JSON.parse(raw) as { tickets: DeletionTicket[] };
  } catch {
    return { tickets: [] };
  }
}

async function writeStore(payload: { tickets: DeletionTicket[] }): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as DeleteBody;
    const email = (body.email || '').trim().toLowerCase();
    const reason = (body.reason || 'User requested account and data deletion.').trim();
    const confirmText = (body.confirmText || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    if (confirmText !== 'DELETE') {
      return NextResponse.json({ error: 'Type DELETE to confirm request.' }, { status: 400 });
    }

    const store = await readStore();
    const ticket: DeletionTicket = {
      ticketId: makeTicketId(),
      email,
      userId: (body.userId || '').trim() || undefined,
      reason,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    store.tickets.unshift(ticket);
    await writeStore(store);

    return NextResponse.json({
      ok: true,
      ticketId: ticket.ticketId,
      status: ticket.status,
      message: 'Deletion request received and queued for review.',
    });
  } catch {
    return NextResponse.json({ error: 'Unable to submit deletion request.' }, { status: 500 });
  }
}
