import type { WorkspaceId } from "./workspace";

export type AtlasRiskLevel = "read" | "write" | "execute" | "network" | "release";

export type AtlasApprovalMode =
  | "never"
  | "on-risk"
  | "always"
  | "policy-controlled";

export interface AtlasActionContext {
  actionId: string;
  taskId: string;
  workspaceId: WorkspaceId;
  actor: "user" | "agent" | "system";
  requestedAt: string;
  risk: AtlasRiskLevel;
  approvalMode: AtlasApprovalMode;
  reason: string;
}

export type AtlasAction =
  | {
      type: "filesystem.read";
      context: AtlasActionContext;
      relativePath: string;
    }
  | {
      type: "filesystem.write";
      context: AtlasActionContext;
      relativePath: string;
      content: string;
      expectedSha256?: string;
    }
  | {
      type: "filesystem.delete";
      context: AtlasActionContext;
      relativePath: string;
      expectedSha256?: string;
    }
  | {
      type: "process.run";
      context: AtlasActionContext;
      executable: string;
      args: string[];
      cwd: string;
      timeoutMs: number;
      environmentKeys: string[];
    }
  | {
      type: "git.create-branch";
      context: AtlasActionContext;
      branchName: string;
      baseRef: string;
    }
  | {
      type: "git.commit";
      context: AtlasActionContext;
      message: string;
      paths: string[];
    }
  | {
      type: "network.request";
      context: AtlasActionContext;
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      url: string;
      bodySha256?: string;
    }
  | {
      type: "release.deploy";
      context: AtlasActionContext;
      environment: string;
      artifactId: string;
    };

export interface AtlasActionEvidence {
  kind:
    | "file-diff"
    | "command-output"
    | "test-result"
    | "screenshot"
    | "build-artifact"
    | "approval";
  uri: string;
  sha256?: string;
  summary: string;
}

export type AtlasActionResult =
  | {
      status: "succeeded";
      actionId: string;
      startedAt: string;
      completedAt: string;
      evidence: AtlasActionEvidence[];
    }
  | {
      status: "denied" | "failed" | "cancelled" | "timed-out";
      actionId: string;
      startedAt: string;
      completedAt: string;
      code: string;
      message: string;
      evidence: AtlasActionEvidence[];
    };
