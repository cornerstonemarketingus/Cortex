import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { NodeWorkspaceFilesystem, WorkspaceFilesystemError } from "../adapters/node/workspace-filesystem";
import type { AtlasWorkspace } from "../core/workspace";

async function withWorkspace(
  run: (workspace: AtlasWorkspace, root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "atlas-workspace-"));
  const workspace: AtlasWorkspace = {
    id: "workspace-test",
    name: "Test workspace",
    rootPath: root,
    trusted: true,
    writePolicy: { mode: "allow-all" },
    createdAt: new Date(0).toISOString(),
    lastOpenedAt: new Date(0).toISOString(),
    version: 1,
  };

  try {
    await run(workspace, root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function expectWorkspaceError(
  code: WorkspaceFilesystemError["code"],
  operation: () => Promise<unknown>,
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof WorkspaceFilesystemError);
    assert.equal(error.code, code);
    return true;
  });
}

test("reads text with content hash", async () => {
  await withWorkspace(async (workspace, root) => {
    await writeFile(path.join(root, "hello.ts"), "export const hello = true;\n");
    const filesystem = new NodeWorkspaceFilesystem();

    const result = await filesystem.readTextFile(workspace, "hello.ts");

    assert.equal(result.content, "export const hello = true;\n");
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
    assert.equal(result.sizeBytes, Buffer.byteLength(result.content));
  });
});

test("rejects lexical traversal", async () => {
  await withWorkspace(async (workspace) => {
    const filesystem = new NodeWorkspaceFilesystem();
    await expectWorkspaceError("PATH_OUTSIDE_WORKSPACE", () =>
      filesystem.readTextFile(workspace, "../outside.txt"),
    );
  });
});

test("rejects reads through a symlink outside the workspace", async (context) => {
  if (process.platform === "win32") {
    context.skip("Symlink creation may require elevated Windows privileges.");
    return;
  }

  await withWorkspace(async (workspace, root) => {
    const outside = await mkdtemp(path.join(os.tmpdir(), "atlas-outside-"));
    try {
      await writeFile(path.join(outside, "secret.txt"), "secret");
      await symlink(outside, path.join(root, "escape"), "dir");
      const filesystem = new NodeWorkspaceFilesystem();

      await expectWorkspaceError("PATH_OUTSIDE_WORKSPACE", () =>
        filesystem.readTextFile(workspace, "escape/secret.txt"),
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test("rejects writes through a symlink", async (context) => {
  if (process.platform === "win32") {
    context.skip("Symlink creation may require elevated Windows privileges.");
    return;
  }

  await withWorkspace(async (workspace, root) => {
    const outside = await mkdtemp(path.join(os.tmpdir(), "atlas-outside-"));
    try {
      await symlink(outside, path.join(root, "escape"), "dir");
      const filesystem = new NodeWorkspaceFilesystem();

      await expectWorkspaceError("PATH_OUTSIDE_WORKSPACE", () =>
        filesystem.writeTextFile(workspace, "escape/payload.txt", "blocked"),
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test("uses optimistic concurrency for writes", async () => {
  await withWorkspace(async (workspace, root) => {
    await writeFile(path.join(root, "counter.txt"), "one");
    const filesystem = new NodeWorkspaceFilesystem();
    const original = await filesystem.readTextFile(workspace, "counter.txt");
    await writeFile(path.join(root, "counter.txt"), "two");

    await expectWorkspaceError("FILE_CHANGED", () =>
      filesystem.writeTextFile(
        workspace,
        "counter.txt",
        "three",
        original.sha256,
      ),
    );
  });
});

test("writes atomically and returns before/after hashes", async () => {
  await withWorkspace(async (workspace, root) => {
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src", "index.ts"), "old");
    const filesystem = new NodeWorkspaceFilesystem();
    const original = await filesystem.readTextFile(workspace, "src/index.ts");

    const result = await filesystem.writeTextFile(
      workspace,
      "src/index.ts",
      "new",
      original.sha256,
    );

    assert.equal(result.previousSha256, original.sha256);
    assert.notEqual(result.sha256, original.sha256);
    assert.equal(await readFile(path.join(root, "src", "index.ts"), "utf8"), "new");
  });
});

test("rejects binary and oversized text files", async () => {
  await withWorkspace(async (workspace, root) => {
    await writeFile(path.join(root, "binary.dat"), Buffer.from([1, 0, 2]));
    await writeFile(path.join(root, "large.txt"), "12345");
    const filesystem = new NodeWorkspaceFilesystem({ maxTextFileBytes: 4 });

    await expectWorkspaceError("BINARY_FILE", () =>
      filesystem.readTextFile(workspace, "binary.dat"),
    );
    await expectWorkspaceError("FILE_TOO_LARGE", () =>
      filesystem.readTextFile(workspace, "large.txt"),
    );
  });
});

test("requires a trusted, writable workspace", async () => {
  await withWorkspace(async (workspace) => {
    const filesystem = new NodeWorkspaceFilesystem();
    const untrusted = { ...workspace, trusted: false };
    const readOnly = {
      ...workspace,
      writePolicy: { mode: "read-only" } as const,
    };

    await assert.rejects(() => filesystem.readTextFile(untrusted, "file.txt"));
    await assert.rejects(() =>
      filesystem.writeTextFile(readOnly, "file.txt", "blocked"),
    );
  });
});
