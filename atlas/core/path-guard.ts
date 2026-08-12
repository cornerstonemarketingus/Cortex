import path from "node:path";

import type { AtlasWorkspace } from "./workspace";

export class WorkspacePathError extends Error {
  readonly code = "PATH_OUTSIDE_WORKSPACE" as const;

  constructor(message: string) {
    super(message);
    this.name = "WorkspacePathError";
  }
}

/**
 * Resolves a user- or model-supplied relative path inside a trusted workspace.
 *
 * This lexical check is only the first boundary. The desktop adapter must also
 * resolve real paths before writes so a symlink cannot escape the workspace.
 */
export function resolveWorkspacePath(
  workspaceRoot: string,
  relativePath: string,
): string {
  if (!path.isAbsolute(workspaceRoot)) {
    throw new WorkspacePathError("Workspace root must be absolute.");
  }

  if (path.isAbsolute(relativePath)) {
    throw new WorkspacePathError("Workspace paths must be relative.");
  }

  if (relativePath.includes("\0")) {
    throw new WorkspacePathError("Workspace path contains a null byte.");
  }

  const root = path.resolve(workspaceRoot);
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);

  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new WorkspacePathError("Path resolves outside the workspace.");
  }

  return candidate;
}

export function assertWorkspaceTrusted(workspace: AtlasWorkspace): void {
  if (!workspace.trusted) {
    throw new Error("Workspace must be trusted before local tools can run.");
  }
}

export function assertWriteAllowed(
  workspace: AtlasWorkspace,
  relativePath: string,
): void {
  assertWorkspaceTrusted(workspace);
  resolveWorkspacePath(workspace.rootPath, relativePath);

  if (workspace.writePolicy.mode === "read-only") {
    throw new Error("Workspace is read-only.");
  }

  if (workspace.writePolicy.mode === "allow-list") {
    // Glob matching belongs in the desktop adapter so the core stays dependency-free.
    // Until then, deny writes rather than silently broadening permissions.
    throw new Error(
      "Allow-list writes require the desktop policy adapter and are denied by core.",
    );
  }
}
