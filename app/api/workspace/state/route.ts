import { NextResponse } from 'next/server';
import { getWorkspaceState, rollbackWorkspace, saveWorkspaceRevision } from '@/lib/workspaceStore';

type SaveBody = {
  ownerKey?: string;
  model?: unknown;
  label?: string;
};

type RollbackBody = {
  ownerKey?: string;
  revisionId?: number;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ownerKey = (url.searchParams.get('ownerKey') || 'default-user').trim();

    const payload = await getWorkspaceState(ownerKey);
    if (!payload) {
      return NextResponse.json({ workspace: null, revisions: [] });
    }

    return NextResponse.json({
      workspace: {
        id: payload.workspace.id,
        ownerKey: payload.workspace.ownerKey,
        model: payload.workspace.modelJson,
        updatedAt: payload.workspace.updatedAt,
        currentRevisionId: payload.workspace.currentRevisionId,
      },
      revisions: payload.revisions.map((revision: { id: number; label: string; createdAt: Date }) => ({
        id: revision.id,
        label: revision.label,
        createdAt: revision.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Unable to load workspace state.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SaveBody;
    const ownerKey = (body.ownerKey || 'default-user').trim();

    if (!body.model) {
      return NextResponse.json({ error: 'model is required' }, { status: 400 });
    }

    const saved = await saveWorkspaceRevision({
      ownerKey,
      model: body.model,
      label: (body.label || 'save').trim(),
    });

    return NextResponse.json({ saved });
  } catch {
    return NextResponse.json({ error: 'Unable to save workspace state.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RollbackBody;
    const ownerKey = (body.ownerKey || 'default-user').trim();
    const revisionId = Number(body.revisionId);

    if (!Number.isFinite(revisionId)) {
      return NextResponse.json({ error: 'revisionId is required' }, { status: 400 });
    }

    const model = await rollbackWorkspace(ownerKey, revisionId);
    if (!model) {
      return NextResponse.json({ error: 'Unable to rollback; revision not found.' }, { status: 404 });
    }

    return NextResponse.json({ model });
  } catch {
    return NextResponse.json({ error: 'Unable to rollback workspace.' }, { status: 500 });
  }
}
