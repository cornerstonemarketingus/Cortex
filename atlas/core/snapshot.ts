import type { AtlasWorkspace, WorkspaceFile } from "./workspace";

export interface WorkspaceIndexFile extends WorkspaceFile {
  sha256?: string;
  language?: string;
  ignored?: boolean;
}

export interface WorkspaceRepositoryState {
  branch: string | null;
  headSha: string | null;
  dirty: boolean;
  changedPaths: string[];
}

export interface WorkspaceIndexSnapshot {
  workspace: AtlasWorkspace;
  generatedAt: string;
  fileCount: number;
  totalBytes: number;
  files: WorkspaceIndexFile[];
  git?: WorkspaceRepositoryState;
}

export interface WorkspaceIndexOptions {
  maxFiles?: number;
  maxDepth?: number;
  includeHidden?: boolean;
  ignoredDirectoryNames?: string[];
}

export interface WorkspaceSearchMatch {
  relativePath: string;
  line: number;
  column: number;
  preview: string;
}

export interface WorkspaceIndexService {
  createSnapshot(
    workspace: AtlasWorkspace,
    options?: WorkspaceIndexOptions,
  ): Promise<WorkspaceIndexSnapshot>;
  searchText(
    workspace: AtlasWorkspace,
    query: string,
    limit?: number,
  ): Promise<WorkspaceSearchMatch[]>;
}
