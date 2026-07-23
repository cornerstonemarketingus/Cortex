# Atlas

Atlas is a local-first AI software engineering workspace. Phase 1 establishes the trusted workspace boundary before editor, terminal, Git, model, or autonomous-agent features are connected.

## Phase 1: Local Workspace

Current slice:

- [x] Define the workspace and file-system contracts.
- [x] Add path-containment and write-policy guards.
- [x] Define commands and events for the future desktop shell.
- [ ] Add a Tauri desktop host.
- [ ] Add Monaco editor tabs and file tree.
- [ ] Add terminal process lifecycle management.
- [ ] Add Git status, diff, stage, commit, and branch adapters.
- [ ] Persist trusted workspaces and recent projects.
- [ ] Add unit tests for symlinks, traversal, binary files, and large files.

## Security boundary

Atlas must never treat an AI-generated path or command as trusted input. Every file operation must be resolved against a user-approved workspace root, normalized, checked for containment, and evaluated against the workspace write policy.

Autonomous editing is intentionally out of scope for Phase 1. The first milestone is a dependable local IDE shell that a human controls.

## Proposed package layout

```text
atlas/
  core/       Framework-independent domain contracts and guards
  desktop/    Tauri host and operating-system adapters (next slice)
  web/        React workspace UI (next slice)
  tests/      Workspace and adapter tests (next slice)
```
