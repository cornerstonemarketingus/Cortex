import path from "node:path";
import { watch, type FSWatcher } from "node:fs";
import { lstat, readdir, realpath } from "node:fs/promises";

import { resolveWorkspacePath } from "../../core/path-guard";
import type { AtlasWorkspace } from "../../core/workspace";

export interface WorkspaceWatchEvent {
  type: "created" | "changed" | "deleted" | "unknown";
  relativePath: string;
}

export interface WorkspaceWatcherOptions {
  debounceMs?: number;
}

export type WorkspaceWatchListener = (events: WorkspaceWatchEvent[]) => void;

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`))
  );
}

export class NodeWorkspaceWatcher {
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly pendingEvents = new Map<string, WorkspaceWatchEvent>();
  private flushTimer: NodeJS.Timeout | undefined;
  private closed = false;

  constructor(
    private readonly workspace: AtlasWorkspace,
    private readonly listener: WorkspaceWatchListener,
    private readonly options: WorkspaceWatcherOptions = {},
  ) {}

  async start(): Promise<void> {
    if (this.closed) {
      throw new Error("Workspace watcher has already been closed.");
    }

    const realRoot = await realpath(this.workspace.rootPath);
    await this.watchDirectory(realRoot, realRoot);
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
    this.pendingEvents.clear();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      const events = [...this.pendingEvents.values()].sort((left, right) =>
        left.relativePath.localeCompare(right.relativePath),
      );
      this.pendingEvents.clear();
      if (events.length > 0) {
        this.listener(events);
      }
    }, this.options.debounceMs ?? 75);
  }

  private queue(event: WorkspaceWatchEvent): void {
    this.pendingEvents.set(event.relativePath, event);
    this.scheduleFlush();
  }

  private async classify(absolutePath: string): Promise<WorkspaceWatchEvent["type"]> {
    try {
      await lstat(absolutePath);
      return "changed";
    } catch {
      return "deleted";
    }
  }

  private async watchDirectory(realRoot: string, directory: string): Promise<void> {
    if (this.watchers.has(directory) || this.closed) {
      return;
    }

    const directoryRealPath = await realpath(directory);
    if (!isInside(realRoot, directoryRealPath)) {
      return;
    }

    const entries = await readdir(directoryRealPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        await this.watchDirectory(realRoot, path.join(directoryRealPath, entry.name));
      }
    }

    const watcher = watch(directoryRealPath, async (_eventType, filename) => {
      if (this.closed || !filename) {
        return;
      }

      const absolutePath = path.join(directoryRealPath, filename.toString());
      if (!isInside(realRoot, absolutePath)) {
        return;
      }

      const relativePath = path.relative(realRoot, absolutePath);
      resolveWorkspacePath(this.workspace.rootPath, relativePath);

      let eventType: WorkspaceWatchEvent["type"] = "unknown";
      try {
        const entry = await lstat(absolutePath);
        if (entry.isSymbolicLink()) {
          return;
        }
        eventType = "changed";
        if (entry.isDirectory()) {
          await this.watchDirectory(realRoot, absolutePath);
        }
      } catch {
        eventType = await this.classify(absolutePath);
        const removedWatcher = this.watchers.get(absolutePath);
        removedWatcher?.close();
        this.watchers.delete(absolutePath);
      }

      this.queue({ type: eventType, relativePath });
    });

    watcher.on("error", () => {
      this.queue({
        type: "unknown",
        relativePath: path.relative(realRoot, directoryRealPath),
      });
    });

    this.watchers.set(directoryRealPath, watcher);
  }
}
