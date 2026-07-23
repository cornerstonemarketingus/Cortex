import type {
  AtlasBridgeRequest,
  AtlasBridgeResponse,
  AtlasWorkspaceBridge,
} from "../../core/bridge";
import type { WorkspaceEvent, WorkspaceSnapshot } from "../../core/workspace";
import { NodeWorkspaceFilesystem } from "./workspace-filesystem";
import { NodeWorkspaceIndexService } from "./workspace-index";
import { NodeWorkspaceRegistry } from "./workspace-registry";

function errorResponse(id: string, error: unknown): AtlasBridgeResponse {
  if (error instanceof Error) {
    const code =
      "code" in error && typeof error.code === "string"
        ? error.code
        : "ATLAS_BRIDGE_ERROR";
    return { id, ok: false, error: { code, message: error.message } };
  }

  return {
    id,
    ok: false,
    error: { code: "ATLAS_BRIDGE_ERROR", message: "Unknown Atlas bridge error." },
  };
}

export class NodeAtlasWorkspaceBridge implements AtlasWorkspaceBridge {
  private readonly listeners = new Set<(event: WorkspaceEvent) => void>();

  constructor(
    private readonly registry: NodeWorkspaceRegistry,
    private readonly filesystem = new NodeWorkspaceFilesystem(),
    private readonly index = new NodeWorkspaceIndexService(),
  ) {}

  subscribe(listener: (event: WorkspaceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: WorkspaceEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  async dispatch(request: AtlasBridgeRequest): Promise<AtlasBridgeResponse> {
    try {
      const command = request.command;

      switch (command.type) {
        case "registry.list":
          return {
            id: request.id,
            ok: true,
            payload: { type: "workspace-list", workspaces: await this.registry.list() },
          };

        case "registry.register": {
          const workspace = await this.registry.register(command);
          return {
            id: request.id,
            ok: true,
            payload: { type: "workspace", workspace },
          };
        }

        case "registry.trust": {
          const workspace = await this.registry.updateTrust(
            command.workspaceId,
            command.trusted,
            command.writePolicy,
          );
          return {
            id: request.id,
            ok: true,
            payload: { type: "workspace", workspace },
          };
        }

        case "registry.remove":
          await this.registry.remove(command.workspaceId);
          return {
            id: request.id,
            ok: true,
            payload: { type: "acknowledged" },
          };

        case "workspace.open": {
          const workspace = await this.registry.register({ rootPath: command.rootPath });
          const indexSnapshot = workspace.trusted
            ? await this.index.createSnapshot(workspace)
            : undefined;
          const snapshot: WorkspaceSnapshot = {
            workspace,
            files: indexSnapshot?.files ?? [],
          };
          this.emit({ type: "workspace.opened", snapshot });
          return {
            id: request.id,
            ok: true,
            payload: { type: "workspace-snapshot", snapshot },
          };
        }

        case "workspace.close":
          this.emit({ type: "workspace.closed", workspaceId: command.workspaceId });
          return {
            id: request.id,
            ok: true,
            payload: { type: "acknowledged" },
          };

        case "workspace.refresh": {
          const workspace = await this.registry.get(command.workspaceId);
          const indexSnapshot = await this.index.createSnapshot(workspace);
          const snapshot: WorkspaceSnapshot = {
            workspace,
            files: indexSnapshot.files,
          };
          this.emit({
            type: "workspace.changed",
            workspaceId: command.workspaceId,
            paths: indexSnapshot.files.map(({ relativePath }) => relativePath),
          });
          return {
            id: request.id,
            ok: true,
            payload: { type: "workspace-snapshot", snapshot },
          };
        }

        case "index.snapshot": {
          const workspace = await this.registry.get(command.workspaceId);
          const snapshot = await this.index.createSnapshot(workspace);
          return {
            id: request.id,
            ok: true,
            payload: { type: "index-snapshot", snapshot },
          };
        }

        case "index.search": {
          const workspace = await this.registry.get(command.workspaceId);
          const matches = await this.index.searchText(
            workspace,
            command.query,
            command.limit,
          );
          return {
            id: request.id,
            ok: true,
            payload: { type: "search-results", matches },
          };
        }

        case "file.read": {
          const workspace = await this.registry.get(command.workspaceId);
          const result = await this.filesystem.readTextFile(
            workspace,
            command.relativePath,
          );
          return {
            id: request.id,
            ok: true,
            payload: {
              type: "file-content",
              relativePath: result.relativePath,
              content: result.content,
              sha256: result.sha256,
              modifiedAt: result.modifiedAt,
            },
          };
        }

        case "file.write": {
          const workspace = await this.registry.get(command.workspaceId);
          const result = await this.filesystem.writeTextFile(
            workspace,
            command.relativePath,
            command.content,
            command.expectedSha256,
          );
          this.emit({
            type: "workspace.changed",
            workspaceId: workspace.id,
            paths: [command.relativePath],
          });
          return {
            id: request.id,
            ok: true,
            payload: {
              type: "file-written",
              relativePath: result.relativePath,
              previousSha256: result.previousSha256,
              sha256: result.sha256,
            },
          };
        }

        case "file.delete": {
          const workspace = await this.registry.get(command.workspaceId);
          const result = await this.filesystem.deleteFile(
            workspace,
            command.relativePath,
            command.expectedSha256,
          );
          this.emit({
            type: "workspace.changed",
            workspaceId: workspace.id,
            paths: [command.relativePath],
          });
          return {
            id: request.id,
            ok: true,
            payload: {
              type: "file-deleted",
              relativePath: result.relativePath,
              deletedSha256: result.deletedSha256,
            },
          };
        }
      }

      return errorResponse(
        request.id,
        new Error("Atlas bridge received an unsupported command."),
      );
    } catch (error) {
      return errorResponse(request.id, error);
    }
  }
}
