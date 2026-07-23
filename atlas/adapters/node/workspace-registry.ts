import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";

import {
  ATLAS_WORKSPACE_VERSION,
  type AtlasWorkspace,
  type WorkspaceId,
  type WorkspaceWritePolicy,
} from "../../core/workspace";

const REGISTRY_SCHEMA_VERSION = 1 as const;

interface WorkspaceRegistryDocument {
  schemaVersion: typeof REGISTRY_SCHEMA_VERSION;
  workspaces: AtlasWorkspace[];
}

export interface RegisterWorkspaceInput {
  name?: string;
  rootPath: string;
  trusted?: boolean;
  writePolicy?: WorkspaceWritePolicy;
}

export class WorkspaceRegistryError extends Error {
  constructor(
    readonly code:
      | "INVALID_ROOT"
      | "NOT_FOUND"
      | "CORRUPT_REGISTRY"
      | "IO_ERROR",
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WorkspaceRegistryError";
  }
}

function normalizeForComparison(value: string): string {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function workspaceNameFromRoot(rootPath: string): string {
  return path.basename(rootPath) || rootPath;
}

function isNodeError(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });

  const temporaryPath = path.join(
    directory,
    `.atlas-registry-${randomUUID()}.tmp`,
  );
  let handle: Awaited<ReturnType<typeof open>> | undefined;

  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, filePath);
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

function isWorkspace(value: unknown): value is AtlasWorkspace {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AtlasWorkspace>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.rootPath === "string" &&
    typeof candidate.trusted === "boolean" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.lastOpenedAt === "string" &&
    candidate.version === ATLAS_WORKSPACE_VERSION &&
    !!candidate.writePolicy &&
    typeof candidate.writePolicy === "object"
  );
}

export class NodeWorkspaceRegistry {
  constructor(readonly registryFilePath: string) {
    if (!path.isAbsolute(registryFilePath)) {
      throw new WorkspaceRegistryError(
        "IO_ERROR",
        "Workspace registry path must be absolute.",
      );
    }
  }

  private async loadDocument(): Promise<WorkspaceRegistryDocument> {
    try {
      const raw = await readFile(this.registryFilePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<WorkspaceRegistryDocument>;

      if (
        parsed.schemaVersion !== REGISTRY_SCHEMA_VERSION ||
        !Array.isArray(parsed.workspaces) ||
        !parsed.workspaces.every(isWorkspace)
      ) {
        throw new WorkspaceRegistryError(
          "CORRUPT_REGISTRY",
          "Atlas workspace registry has an unsupported or invalid schema.",
        );
      }

      return {
        schemaVersion: REGISTRY_SCHEMA_VERSION,
        workspaces: parsed.workspaces,
      };
    } catch (error) {
      if (isNodeError(error, "ENOENT")) {
        return { schemaVersion: REGISTRY_SCHEMA_VERSION, workspaces: [] };
      }
      if (error instanceof WorkspaceRegistryError) {
        throw error;
      }
      throw new WorkspaceRegistryError(
        "CORRUPT_REGISTRY",
        "Unable to read the Atlas workspace registry.",
        error,
      );
    }
  }

  private async saveDocument(document: WorkspaceRegistryDocument): Promise<void> {
    try {
      await atomicWriteJson(this.registryFilePath, document);
    } catch (error) {
      throw new WorkspaceRegistryError(
        "IO_ERROR",
        "Unable to persist the Atlas workspace registry.",
        error,
      );
    }
  }

  async list(): Promise<AtlasWorkspace[]> {
    const document = await this.loadDocument();
    return [...document.workspaces].sort((left, right) =>
      right.lastOpenedAt.localeCompare(left.lastOpenedAt),
    );
  }

  async get(workspaceId: WorkspaceId): Promise<AtlasWorkspace> {
    const document = await this.loadDocument();
    const workspace = document.workspaces.find(({ id }) => id === workspaceId);

    if (!workspace) {
      throw new WorkspaceRegistryError(
        "NOT_FOUND",
        `Workspace ${workspaceId} is not registered.`,
      );
    }

    return workspace;
  }

  async register(input: RegisterWorkspaceInput): Promise<AtlasWorkspace> {
    let resolvedRoot: string;

    try {
      resolvedRoot = await realpath(path.resolve(input.rootPath));
      const entry = await lstat(resolvedRoot);
      if (!entry.isDirectory()) {
        throw new WorkspaceRegistryError(
          "INVALID_ROOT",
          "Workspace root must be a directory.",
        );
      }
    } catch (error) {
      if (error instanceof WorkspaceRegistryError) {
        throw error;
      }
      throw new WorkspaceRegistryError(
        "INVALID_ROOT",
        "Workspace root does not exist or cannot be resolved.",
        error,
      );
    }

    const document = await this.loadDocument();
    const comparisonRoot = normalizeForComparison(resolvedRoot);
    const existingIndex = document.workspaces.findIndex(
      ({ rootPath }) => normalizeForComparison(rootPath) === comparisonRoot,
    );
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = document.workspaces[existingIndex];
      const updated: AtlasWorkspace = {
        ...existing,
        name: input.name?.trim() || existing.name,
        lastOpenedAt: now,
      };
      document.workspaces[existingIndex] = updated;
      await this.saveDocument(document);
      return updated;
    }

    const workspace: AtlasWorkspace = {
      id: randomUUID(),
      name: input.name?.trim() || workspaceNameFromRoot(resolvedRoot),
      rootPath: resolvedRoot,
      trusted: input.trusted ?? false,
      writePolicy: input.writePolicy ?? { mode: "read-only" },
      createdAt: now,
      lastOpenedAt: now,
      version: ATLAS_WORKSPACE_VERSION,
    };

    document.workspaces.push(workspace);
    await this.saveDocument(document);
    return workspace;
  }

  async updateTrust(
    workspaceId: WorkspaceId,
    trusted: boolean,
    writePolicy?: WorkspaceWritePolicy,
  ): Promise<AtlasWorkspace> {
    const document = await this.loadDocument();
    const index = document.workspaces.findIndex(({ id }) => id === workspaceId);

    if (index < 0) {
      throw new WorkspaceRegistryError(
        "NOT_FOUND",
        `Workspace ${workspaceId} is not registered.`,
      );
    }

    const current = document.workspaces[index];
    const updated: AtlasWorkspace = {
      ...current,
      trusted,
      writePolicy:
        writePolicy ?? (trusted ? current.writePolicy : { mode: "read-only" }),
      lastOpenedAt: new Date().toISOString(),
    };
    document.workspaces[index] = updated;
    await this.saveDocument(document);
    return updated;
  }

  async remove(workspaceId: WorkspaceId): Promise<void> {
    const document = await this.loadDocument();
    const next = document.workspaces.filter(({ id }) => id !== workspaceId);

    if (next.length === document.workspaces.length) {
      throw new WorkspaceRegistryError(
        "NOT_FOUND",
        `Workspace ${workspaceId} is not registered.`,
      );
    }

    await this.saveDocument({
      schemaVersion: REGISTRY_SCHEMA_VERSION,
      workspaces: next,
    });
  }
}
