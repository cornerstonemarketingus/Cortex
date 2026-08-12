import type { AtlasAction, AtlasRiskLevel } from "./actions";

export interface AtlasPolicy {
  id: string;
  name: string;
  allowedRisks: AtlasRiskLevel[];
  deniedActionTypes: AtlasAction["type"][];
  allowedExecutables: string[];
  allowedNetworkHosts: string[];
  protectedBranches: string[];
  requireApprovalFor: AtlasRiskLevel[];
  maxCommandTimeoutMs: number;
}

export type PolicyDecision =
  | { outcome: "allow"; reason: string }
  | { outcome: "require-approval"; reason: string }
  | { outcome: "deny"; reason: string };

export const DEFAULT_LOCAL_POLICY: AtlasPolicy = {
  id: "atlas.local.default",
  name: "Atlas Local Default",
  allowedRisks: ["read", "write", "execute"],
  deniedActionTypes: ["release.deploy"],
  allowedExecutables: [
    "node",
    "npm",
    "npx",
    "pnpm",
    "yarn",
    "git",
    "tsx",
    "tsc",
  ],
  allowedNetworkHosts: [],
  protectedBranches: ["main", "master", "production"],
  requireApprovalFor: ["write", "execute", "network", "release"],
  maxCommandTimeoutMs: 15 * 60 * 1000,
};

export function evaluateActionPolicy(
  action: AtlasAction,
  policy: AtlasPolicy,
): PolicyDecision {
  if (policy.deniedActionTypes.includes(action.type)) {
    return { outcome: "deny", reason: `${action.type} is denied by policy.` };
  }

  if (!policy.allowedRisks.includes(action.context.risk)) {
    return {
      outcome: "deny",
      reason: `Risk level ${action.context.risk} is not enabled.`,
    };
  }

  if (action.type === "process.run") {
    if (!policy.allowedExecutables.includes(action.executable)) {
      return {
        outcome: "deny",
        reason: `Executable ${action.executable} is not allow-listed.`,
      };
    }

    if (action.timeoutMs > policy.maxCommandTimeoutMs) {
      return {
        outcome: "deny",
        reason: `Command timeout exceeds ${policy.maxCommandTimeoutMs}ms.`,
      };
    }
  }

  if (action.type === "network.request") {
    let host: string;
    try {
      host = new URL(action.url).host;
    } catch {
      return { outcome: "deny", reason: "Network URL is invalid." };
    }

    if (!policy.allowedNetworkHosts.includes(host)) {
      return { outcome: "deny", reason: `Network host ${host} is not allowed.` };
    }
  }

  if (policy.requireApprovalFor.includes(action.context.risk)) {
    return {
      outcome: "require-approval",
      reason: `Risk level ${action.context.risk} requires user approval.`,
    };
  }

  return { outcome: "allow", reason: "Action satisfies the active policy." };
}
