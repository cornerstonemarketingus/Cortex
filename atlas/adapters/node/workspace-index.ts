import { createHash } from "node:crypto";
import { lstat, opendir, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { assertWorkspaceTrusted, resolveWorkspacePath } from "../../core/path-guard";
import type {
  WorkspaceIndexFile,
  WorkspaceIndexOptions,
  WorkspaceIndexService,
  WorkspaceIndexSnapshot,
  WorkspaceSearchMatch,
} from "../../core/snapshot";
import type { AtlasWorkspace } from "../../core/workspace";

const DEFAULT_IGNORED_DIRECTORIES = [
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".cache",
];

const DEFAULT_MAX_FILES = 50_000;
const DEFAULT_MAX_DEPTH = 32;
const SEARCH_FILE_LIMIT_BYTES = 1_000_000;

function hashSha256(value: Uint8Array): string {
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

function languageFromPath(relativePath: string): string | undefined {
  const extension = path.extname(relativePath).toLowerCase();
  const languages: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescriptreact",
    ".js": "javascript",
    ".jsx": "javascriptreact",
    ".json": "json",
    ".md": "markdown",
    ".css": "css",
    ".scss": "scss",
    ".html": "html",
    ".py": "python",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".cs": "csharp",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".sql": "sql",
    ".sh": "shell",
    ".ps1": "powershell",
  };
  return languages[extension];
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

export class NodeWorkspaceIndexService implements WorkspaceIndexService {
  async createSnapshot(
    workspace: AtlasWorkspace,
    options: WorkspaceIndexOptions = {},
  ): Promise<WorkspaceIndexSnapshot> {
    assertWorkspaceTrusted(workspace);

    const realRoot = await realpath(workspace.rootPath);
    const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const ignored = new Set([
      ...DEFAULT_IGNORED_DIRECTORIES,
      ...(options.ignoredDirectoryNames ?? []),
    ]);
    const files: WorkspaceIndexFile[] = [];
    let totalBytes = 0;

    const walk = async (absoluteDirectory: string, depth: number): Promise<void> => {
      if (depth > maxDepth || files.length >= maxFiles) {
        return;
      }

      const directory = await opendir(absoluteDirectory);
      for await (const entry of directory) {
        if (files.length >= maxFiles) {
          break;
        }
        if (!options.includeHidden && entry.name.startsWith(".")) {
          continue;
        }

        const absolutePath = path.join(absoluteDirectory, entry.name);
        const relativePath = path.relative(realRoot, absolutePath);

        if (entry.isSymbolicLink()) {
          files.push({ relativePath, kind: "symlink" });
          continue;
        }

        if (entry.isDirectory()) {
          const ignoredDirectory = ignored.has(entry.name);
          files.push({
            relativePath,
            kind: "directory",
            ignored: ignoredDirectory,
          });
          if (!ignoredDirectory) {
            await walk(absolutePath, depth + 1);
          }
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        const realFilePath = await realpath(absolutePath);
        if (!isInside(realRoot, realFilePath)) {
          continue;
        }

        const stats = await lstat(realFilePath);
        const indexFile: WorkspaceIndexFile = {
          relativePath,
          kind: "file",
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          language: languageFromPath(relativePath),
        };

        if (stats.size <= SEARCH_FILE_LIMIT_BYTES) {
          const bytes = await readFile(realFilePath);
          if (!looksBinary(bytes)) {
            indexFile.sha256 = hashSha256(bytes);
          }
        }

        files.push(indexFile);
        totalBytes += stats.size;
      }
    };

    await walk(realRoot, 0);

    return {
      workspace,
      generatedAt: new Date().toISOString(),
      fileCount: files.filter(({ kind }) => kind === "file").length,
      totalBytes,
      files,
    };
  }

  async searchText(
    workspace: AtlasWorkspace,
    query: string,
    limit = 100,
  ): Promise<WorkspaceSearchMatch[]> {
    assertWorkspaceTrusted(workspace);

    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    const snapshot = await this.createSnapshot(workspace);
    const matches: WorkspaceSearchMatch[] = [];

    for (const file of snapshot.files) {
      if (
        file.kind !== "file" ||
        file.sizeBytes === undefined ||
        file.sizeBytes > SEARCH_FILE_LIMIT_BYTES
      ) {
        continue;
      }

      const absolutePath = resolveWorkspacePath(workspace.rootPath, file.relativePath);
      const bytes = await readFile(absolutePath);
      if (looksBinary(bytes)) {
        continue;
      }

      const lines = bytes.toString("utf8").split(/\r?\n/);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        let startIndex = 0;
        while (startIndex <= lines[lineIndex].length) {
          const column = lines[lineIndex].indexOf(normalizedQuery, startIndex);
          if (column < 0) {
            break;
          }

          matches.push({
            relativePath: file.relativePath,
            line: lineIndex + 1,
            column: column + 1,
            preview: lines[lineIndex].slice(0, 300),
          });

          if (matches.length >= limit) {
            return matches;
          }
          startIndex = column + Math.max(1, normalizedQuery.length);
        }
      }
    }

    return matches;
  }
}
