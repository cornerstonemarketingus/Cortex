import { Prisma, PrismaClient } from '@prisma/client';

let localClient: PrismaClient | null = null;

function getClient(): PrismaClient {
  if (!localClient) {
    localClient = new PrismaClient();
  }
  return localClient;
}

type SaveWorkspaceParams = {
  ownerKey: string;
  model: unknown;
  label: string;
};

export async function getWorkspaceState(ownerKey: string) {
  const prisma = getClient();

  const workspace = await prisma.workspaceState.findUnique({
    where: { ownerKey },
  });

  if (!workspace) return null;

  const revisions = await prisma.workspaceRevision.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  return {
    workspace,
    revisions,
  };
}

export async function saveWorkspaceRevision(params: SaveWorkspaceParams) {
  const prisma = getClient();

  const workspace = await prisma.workspaceState.upsert({
    where: { ownerKey: params.ownerKey },
    create: {
      ownerKey: params.ownerKey,
      modelJson: params.model as Prisma.InputJsonValue,
    },
    update: {
      modelJson: params.model as Prisma.InputJsonValue,
    },
  });

  const revision = await prisma.workspaceRevision.create({
    data: {
      workspaceId: workspace.id,
      label: params.label,
      modelJson: params.model as Prisma.InputJsonValue,
    },
  });

  await prisma.workspaceState.update({
    where: { id: workspace.id },
    data: {
      currentRevisionId: revision.id,
      modelJson: params.model as Prisma.InputJsonValue,
    },
  });

  return {
    workspaceId: workspace.id,
    revision,
  };
}

export async function rollbackWorkspace(ownerKey: string, revisionId: number) {
  const prisma = getClient();

  const workspace = await prisma.workspaceState.findUnique({ where: { ownerKey } });
  if (!workspace) {
    return null;
  }

  const revision = await prisma.workspaceRevision.findFirst({
    where: {
      id: revisionId,
      workspaceId: workspace.id,
    },
  });

  if (!revision) {
    return null;
  }

  await prisma.workspaceState.update({
    where: { id: workspace.id },
    data: {
      currentRevisionId: revision.id,
      modelJson: revision.modelJson as Prisma.InputJsonValue,
    },
  });

  await prisma.workspaceRevision.create({
    data: {
      workspaceId: workspace.id,
      label: `rollback-to-${revision.id}`,
      modelJson: revision.modelJson as Prisma.InputJsonValue,
    },
  });

  return revision.modelJson;
}
