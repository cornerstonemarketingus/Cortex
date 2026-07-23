import { createHash, randomUUID } from "node:crypto";
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
  assertWriteAllowed,
  assertWorkspaceTrusted,
  resolveWorkspacePath,
  WorkspacePathError,
} from "../../core/path-guard";
import type {
  AtlasWorkspace,
  WorkspaceErrorCode,
} from "../../core/workspace";

const DEFAULT_MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;

export class WorkspaceFilesystemError extends Error {
  constructor(
    readonly code: WorkspaceErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WorkspaceFilesystemError";
  }
}

export interface WorkspaceTextFile {
  relativePath: string;
  content: string;
  sha256: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface WorkspaceWriteResult {
  relativePath: string;
  previousSha256: string | null;
  sha256: string;
  sizeBytes: number;
}

export interface WorkspaceFilesystemOptions {
  maxTextFileBytes?: number;
}

function hashSha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`))
  );
}

function isNodeError(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

function toWorkspaceError(error: unknown, fallback: string): WorkspaceFilesystemError {
  if (error instanceof WorkspaceFilesystemError) {
    return error;
  }

  if (error instanceof WorkspacePathError) {
    return new WorkspaceFilesystemError(error.code, error.message, error);
  }

  if (isNodeError(error, "ENOENT")) {
    return new WorkspaceFilesystemError("NOT_FOUND", fallback, error);
  }

  return new WorkspaceFilesystemError("IO_ERROR", fallback, error);
}

async function getRealWorkspaceRoot(workspace: AtlasWorkspace): Promise<string> {
  assertWorkspaceTrusted(workspace);

  try {
    return await realpath(workspace.rootPath);
  } catch (error) {
    throw toWorkspaceError(error, "Workspace root does not exist.");
  }
}

async function assertContainedRealPath(
  realRoot: string,
  candidate: string,
): Promise<string> {
  const realCandidate = await realpath(candidate);

  if (!isInside(realRoot, realCandidate)) {
    throw new WorkspaceFilesystemError(
      "PATH_OUTSIDE_WORKSPACE",
      "Path escapes the workspace through a symbolic link.",
    );
  }

  return realCandidate;
}

async function findNearestExistingAncestor(candidate: string): Promise<string> {
  let current = candidate;

  while (true) {
    try {
      await lstat(current);
      return current;
    } catch (error) {
      if (!isNodeError(error, "ENOENT")) {
        throw error;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new WorkspaceFilesystemError(
        "NOT_FOUND",
        "No existing ancestor could be resolved for the workspace path.",
      );
    }
    current = parent;
  }
}

async function assertNoSymlinkSegments(
  realRoot: string,
  absoluteCandidate: string,
): Promise<void> {
  const relative = path.relative(realRoot, absoluteCandidate);
  const segments = relative.split(path.sep).filter(Boolean);
  let current = realRoot;

  for (const segment of segments) {
    current = path.join(current, segment);

    try {
      const entry = await lstat(current);
      if (entry.isSymbolicLink()) {
        throw new WorkspaceFilesystemError(
          "PATH_OUTSIDE_WORKSPACE",
          "Writes through symbolic links are not allowed.",
        );
      }
    } catch (error) {
      if (isNodeError(error, "ENOENT")) {
        return;
      }
      throw error;
    }
  }
}

async function resolveReadablePath(
  workspace: AtlasWorkspace,
  relativePath: string,
): Promise<string> {
  const lexicalPath = resolveWorkspacePath(workspace.rootPath, relativePath);
  const realRoot = await getRealWorkspaceRoot(workspace);

  try {
    return await assertContainedRealPath(realRoot, lexicalPath);
  } catch (error) {
    throw toWorkspaceError(error, `Workspace file not found: ${relativePath}`);
  }
}

async function resolveWritablePath(
  workspace: AtlasWorkspace,
  relativePath: string,
): Promise<string> {
  assertWriteAllowed(workspace, relativePath);

  const realRoot = await getRealWorkspaceRoot(workspace);
  const lexicalPath = resolveWorkspacePath(workspace.rootPath, relativePath);
  const nearestAncestor = await findNearestExistingAncestor(
    path.dirname(lexicalPath),
  );
  const realAncestor = await realpath(nearestAncestor);

  if (!isInside(realRoot, realAncestor)) {
    throw new WorkspaceFilesystemError(
      "PATH_OUTSIDE_WORKSPACE",
      "Write target escapes the workspace through a symbolic link.",
    );
  }

  await assertNoSymlinkSegments(realRoot, lexicalPath);
  return lexicalPath;
}

async function readCurrentSha256(absolutePath: string): Promise<string | null> {
  try {
    const entry = await lstat(absolutePath);
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      throw new WorkspaceFilesystemError(
        "IO_ERROR",
        "Only regular files can be modified by the workspace adapter.",
      );
    }
    return hashSha256(await readFile(absolutePath));
  } catch (error) {
    if (isNodeError(error, "ENOENT")) {
      return null;
    }
    throw error;
  }
}

function assertExpectedHash(
  expectedSha256: string | undefined,
  actualSha256: string | null,
): void {
  if (expectedSha256 !== undefined && expectedSha256 !== actualSha256) {
    throw new WorkspaceFilesystemError(
      "FILE_CHANGED",
      "The file changed after it was read. Refresh before applying the edit.",
    );
  }
}

function looksBinary(buffer: Uint8Array): boolean {
  const inspectedBytes = Math.min(buffer.byteLength, 8_192);
  for (let index = 0; index < inspectedBytes; index += 1) {
    if (buffer[index] === 0) {
      return true;
    }
  }
  return false;
}

export class NodeWorkspaceFilesystem {
  readonly maxTextFileBytes: number;

  constructor(options: WorkspaceFilesystemOptions = {}) {
    this.maxTextFileBytes =
      options.maxTextFileBytes ?? DEFAULT_MAX_TEXT_FILE_BYTES;
  }

  async readTextFile(
    workspace: AtlasWorkspace,
    relativePath: string,
  ): Promise<WorkspaceTextFile> {
    const absolutePath = await resolveReadablePath(workspace, relativePath);

    try {
      const entry = await lstat(absolutePath);
      if (!entry.isFile()) {
        throw new WorkspaceFilesystemError(
          "IO_ERROR",
          "Only regular files can be opened as text.",
        );
      }
      if (entry.size > this.maxTextFileBytes) {
        throw new WorkspaceFilesystemError(
          "FILE_TOO_LARGE",
          `File exceeds the ${this.maxTextFileBytes}-byte text limit.`,
        );
      }

      const bytes = await readFile(absolutePath);
      if (looksBinary(bytes)) {
        throw new WorkspaceFilesystemError(
          "BINARY_FILE",
          "Binary files must be opened through an artifact viewer.",
        );
      }

      return {
        relativePath,
        content: bytes.toString("utf8"),
        sha256: hashSha256(bytes),
        sizeBytes: bytes.byteLength,
        modifiedAt: entry.mtime.toISOString(),
      };
    } catch (error) {
      throw toWorkspaceError(error, `Unable to read ${relativePath}.`);
    }
  }

  async writeTextFile(
    workspace: AtlasWorkspace,
    relativePath: string,
    content: string,
    expectedSha256?: string,
  ): Promise<WorkspaceWriteResult> {
    const bytes = Buffer.from(content, "utf8");
    if (bytes.byteLength > this.maxTextFileBytes) {
      throw new WorkspaceFilesystemError(
        "FILE_TOO_LARGE",
        `Write exceeds the ${this.maxTextFileBytes}-byte text limit.`,
      );
    }

    const absolutePath = await resolveWritablePath(workspace, relativePath);
    const previousSha256 = await readCurrentSha256(absolutePath);
    assertExpectedHash(expectedSha256, previousSha256);

    const directory = path.dirname(absolutePath);
    await mkdir(directory, { recursive: true });
    await assertNoSymlinkSegments(
      await getRealWorkspaceRoot(workspace),
      directory,
    );

    const temporaryPath = path.join(
      directory,
      `.atlas-${path.basename(absolutePath)}-${randomUUID()}.tmp`,
    );
    const nextSha256 = hashSha256(bytes);
    let handle: Awaited<ReturnType<typeof open>> | undefined;

    try {
      handle = await open(temporaryPath, "wx", 0o600);
      await handle.writeFile(bytes);
      await handle.sync();
      await handle.close();
      handle = undefined;
      await rename(temporaryPath, absolutePath);
    } catch (error) {
      await handle?.close().catch(() => undefined);
      await unlink(temporaryPath).catch(() => undefined);
      throw toWorkspaceError(error, `Unable to write ${relativePath}.`);
    }

    return {
      relativePath,
      previousSha256,
      sha256: nextSha256,
      sizeBytes: bytes.byteLength,
    };
  }

  async deleteFile(
    workspace: AtlasWorkspace,
    relativePath: string,
    expectedSha256?: string,
  ): Promise<{ relativePath: string; deletedSha256: string }> {
    const absolutePath = await resolveWritablePath(workspace, relativePath);
    const currentSha256 = await readCurrentSha256(absolutePath);

    if (currentSha256 === null) {
      throw new WorkspaceFilesystemError(
        "NOT_FOUND",
        `Workspace file not found: ${relativePath}`,
      );
    }
    assertExpectedHash(expectedSha256, currentSha256);

    try {
      await unlink(absolutePath);
      return { relativePath, deletedSha256: currentSha256 };
    } catch (error) {
      throw toWorkspaceError(error, `Unable to delete ${relativePath}.`);
    }
  }
}
