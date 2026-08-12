import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { NodeAtlasWorkspaceBridge } from "../adapters/node/workspace-bridge";
import { NodeWorkspaceRegistry } from "../adapters/node/workspace-registry";

async function withBridge(
  run: (
    bridge: NodeAtlasWorkspaceBridge,
    rootPath: string,
  ) => Promise<void>,
): Promise<void> {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "atlas-bridge-"));
  const workspaceRoot = path.join(temporaryRoot, "workspace");
  const registryPath = path.join(temporaryRoot, "state", "workspaces.json");
  await import("node:fs/promises").then(({ mkdir }) =>
    mkdir(workspaceRoot, { recursive: true }),
  );

  try {
    await run(
      new NodeAtlasWorkspaceBridge(new NodeWorkspaceRegistry(registryPath)),
      workspaceRoot,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

test("registers, trusts, indexes, reads, writes, searches, and emits changes", async () => {
  await withBridge(async (bridge, rootPath) => {
    await writeFile(path.join(rootPath, "hello.ts"), "export const hello = 'world';\n");

    const registered = await bridge.dispatch({
      id: "register",
      command: { type: "registry.register", rootPath },
    });
    assert.equal(registered.ok, true);
    if (!registered.ok || registered.payload.type !== "workspace") {
      assert.fail("Expected registered workspace payload.");
    }

    const workspaceId = registered.payload.workspace.id;
    assert.equal(registered.payload.workspace.trusted, false);

    const trusted = await bridge.dispatch({
      id: "trust",
      command: {
        type: "registry.trust",
        workspaceId,
        trusted: true,
        writePolicy: { mode: "allow-all" },
      },
    });
    assert.equal(trusted.ok, true);

    const events: string[] = [];
    const unsubscribe = bridge.subscribe((event) => events.push(event.type));

    const snapshot = await bridge.dispatch({
      id: "snapshot",
      command: { type: "index.snapshot", workspaceId },
    });
    assert.equal(snapshot.ok, true);
    if (!snapshot.ok || snapshot.payload.type !== "index-snapshot") {
      assert.fail("Expected index snapshot payload.");
    }
    assert.equal(snapshot.payload.snapshot.fileCount, 1);

    const opened = await bridge.dispatch({
      id: "read",
      command: { type: "file.read", workspaceId, relativePath: "hello.ts" },
    });
    assert.equal(opened.ok, true);
    if (!opened.ok || opened.payload.type !== "file-content") {
      assert.fail("Expected file content payload.");
    }

    const written = await bridge.dispatch({
      id: "write",
      command: {
        type: "file.write",
        workspaceId,
        relativePath: "hello.ts",
        content: "export const hello = 'atlas';\n",
        expectedSha256: opened.payload.sha256,
      },
    });
    assert.equal(written.ok, true);

    const search = await bridge.dispatch({
      id: "search",
      command: { type: "index.search", workspaceId, query: "atlas" },
    });
    assert.equal(search.ok, true);
    if (!search.ok || search.payload.type !== "search-results") {
      assert.fail("Expected search result payload.");
    }
    assert.equal(search.payload.matches.length, 1);
    assert.equal(search.payload.matches[0].relativePath, "hello.ts");
    assert.deepEqual(events, ["workspace.changed"]);

    unsubscribe();
  });
});

test("returns structured errors for untrusted reads", async () => {
  await withBridge(async (bridge, rootPath) => {
    await writeFile(path.join(rootPath, "secret.txt"), "blocked");
    const registered = await bridge.dispatch({
      id: "register",
      command: { type: "registry.register", rootPath },
    });
    assert.equal(registered.ok, true);
    if (!registered.ok || registered.payload.type !== "workspace") {
      assert.fail("Expected registered workspace payload.");
    }

    const result = await bridge.dispatch({
      id: "read",
      command: {
        type: "file.read",
        workspaceId: registered.payload.workspace.id,
        relativePath: "secret.txt",
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) {
      assert.fail("Expected a bridge error.");
    }
    assert.equal(result.error.code, "ATLAS_BRIDGE_ERROR");
    assert.match(result.error.message, /trusted/i);
  });
});
