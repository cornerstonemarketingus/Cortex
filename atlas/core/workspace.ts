export const ATLAS_WORKSPACE_VERSION = 1 as const;

export type WorkspaceId = string;

export type WorkspaceWritePolicy =
  | { mode: "read-only" }
  | { mode: "allow-all" }
  | { mode: "allow-list"; writableGlobs: string[] };

export interface AtlasWorkspace {
  id: WorkspaceId;
  name: string;
  rootPath: string;
  trusted: boolean;
  writePolicy: WorkspaceWritePolicy;
  createdAt: string;
  lastOpenedAt: string;
  version: typeof ATLAS_WORKSPACE_VERSION;
}

export interface WorkspaceFile {
  relativePath: string;
  kind: "file" | "directory" | "symlink";
  sizeBytes?: number;
  modifiedAt?: string;
}

export interface WorkspaceSnapshot {
  workspace: AtlasWorkspace;
  files: WorkspaceFile[];
  git?: {
    branch: string | null;
    headSha: string | null;
    dirty: boolean;
  };
}

export type WorkspaceCommand =
  | { type: "workspace.open"; rootPath: string }
  | { type: "workspace.close"; workspaceId: WorkspaceId }
  | { type: "file.read"; workspaceId: WorkspaceId; relativePath: string }
  | {
      type: "file.write";
      workspaceId: WorkspaceId;
      relativePath: string;
      content: string;
      expectedSha256?: string;
    }
  | {
      type: "file.delete";
      workspaceId: WorkspaceId;
      relativePath: string;
      expectedSha256?: string;
    }
  | { type: "workspace.refresh"; workspaceId: WorkspaceId };

export type WorkspaceEvent =
  | { type: "workspace.opened"; snapshot: WorkspaceSnapshot }
  | { type: "workspace.closed"; workspaceId: WorkspaceId }
  | { type: "workspace.changed"; workspaceId: WorkspaceId; paths: string[] }
  | {
      type: "workspace.error";
      workspaceId?: WorkspaceId;
      code: WorkspaceErrorCode;
      message: string;
    };

export type WorkspaceErrorCode =
  | "WORKSPACE_NOT_TRUSTED"
  | "PATH_OUTSIDE_WORKSPACE"
  | "PATH_NOT_WRITABLE"
  | "FILE_CHANGED"
  | "FILE_TOO_LARGE"
  | "BINARY_FILE"
  | "NOT_FOUND"
  | "IO_ERROR";
