import type { WorkspaceIndexSnapshot, WorkspaceSearchMatch } from "./snapshot";
import type {
  AtlasWorkspace,
  WorkspaceCommand,
  WorkspaceEvent,
  WorkspaceId,
  WorkspaceSnapshot,
  WorkspaceWritePolicy,
} from "./workspace";

export type AtlasBridgeRequest =
  | { id: string; command: WorkspaceCommand }
  | { id: string; command: { type: "registry.list" } }
  | {
      id: string;
      command: {
        type: "registry.register";
        rootPath: string;
        name?: string;
      };
    }
  | {
      id: string;
      command: {
        type: "registry.trust";
        workspaceId: WorkspaceId;
        trusted: boolean;
        writePolicy?: WorkspaceWritePolicy;
      };
    }
  | {
      id: string;
      command: { type: "registry.remove"; workspaceId: WorkspaceId };
    }
  | {
      id: string;
      command: { type: "index.snapshot"; workspaceId: WorkspaceId };
    }
  | {
      id: string;
      command: {
        type: "index.search";
        workspaceId: WorkspaceId;
        query: string;
        limit?: number;
      };
    };

export type AtlasBridgePayload =
  | { type: "workspace"; workspace: AtlasWorkspace }
  | { type: "workspace-list"; workspaces: AtlasWorkspace[] }
  | { type: "workspace-snapshot"; snapshot: WorkspaceSnapshot }
  | { type: "index-snapshot"; snapshot: WorkspaceIndexSnapshot }
  | { type: "search-results"; matches: WorkspaceSearchMatch[] }
  | {
      type: "file-content";
      relativePath: string;
      content: string;
      sha256: string;
      modifiedAt: string;
    }
  | {
      type: "file-written";
      relativePath: string;
      previousSha256: string | null;
      sha256: string;
    }
  | { type: "file-deleted"; relativePath: string; deletedSha256: string }
  | { type: "acknowledged" };

export type AtlasBridgeResponse =
  | { id: string; ok: true; payload: AtlasBridgePayload }
  | {
      id: string;
      ok: false;
      error: { code: string; message: string };
    };

export interface AtlasWorkspaceBridge {
  dispatch(request: AtlasBridgeRequest): Promise<AtlasBridgeResponse>;
  subscribe(listener: (event: WorkspaceEvent) => void): () => void;
}
