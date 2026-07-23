import type {
  AtlasBridgeRequest,
  AtlasBridgeResponse,
  AtlasWorkspaceBridge,
} from "../core/bridge";
import type { WorkspaceId } from "../core/workspace";

export interface MonacoWorkspaceModel {
  uri: string;
  language?: string;
  value: string;
  sha256: string;
  modifiedAt: string;
}

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function unwrap(response: AtlasBridgeResponse) {
  if (!response.ok) {
    const error = new Error(response.error.message);
    Object.assign(error, { code: response.error.code });
    throw error;
  }
  return response.payload;
}

export class MonacoWorkspaceApi {
  constructor(private readonly bridge: AtlasWorkspaceBridge) {}

  private async dispatch(
    command: AtlasBridgeRequest["command"],
  ) {
    return unwrap(
      await this.bridge.dispatch({ id: requestId(), command } as AtlasBridgeRequest),
    );
  }

  async openModel(
    workspaceId: WorkspaceId,
    relativePath: string,
    language?: string,
  ): Promise<MonacoWorkspaceModel> {
    const payload = await this.dispatch({
      type: "file.read",
      workspaceId,
      relativePath,
    });

    if (payload.type !== "file-content") {
      throw new Error("Atlas bridge returned an unexpected file payload.");
    }

    return {
      uri: `atlas-workspace://${workspaceId}/${encodeURI(relativePath)}`,
      language,
      value: payload.content,
      sha256: payload.sha256,
      modifiedAt: payload.modifiedAt,
    };
  }

  async saveModel(
    workspaceId: WorkspaceId,
    relativePath: string,
    value: string,
    expectedSha256: string,
  ): Promise<string> {
    const payload = await this.dispatch({
      type: "file.write",
      workspaceId,
      relativePath,
      content: value,
      expectedSha256,
    });

    if (payload.type !== "file-written") {
      throw new Error("Atlas bridge returned an unexpected write payload.");
    }

    return payload.sha256;
  }

  async search(workspaceId: WorkspaceId, query: string, limit = 100) {
    const payload = await this.dispatch({
      type: "index.search",
      workspaceId,
      query,
      limit,
    });

    if (payload.type !== "search-results") {
      throw new Error("Atlas bridge returned unexpected search results.");
    }

    return payload.matches;
  }
}
