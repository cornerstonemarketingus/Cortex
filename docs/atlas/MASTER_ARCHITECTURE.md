# Atlas Master Architecture

## Product thesis

Atlas is a local-first autonomous software engineering platform combining the best workflows of an IDE, AI coding agent, source-control platform, CI system, and software-delivery control plane.

It should feel as immediate as VS Code, as context-aware as Cursor, as action-oriented as Codex, and as collaborative and auditable as GitHub. Its differentiator is not unrestricted autonomy. Its differentiator is reliable, inspectable, reversible software execution across the full engineering lifecycle.

## Non-negotiable principles

1. Local-first trust boundary.
2. Typed actions instead of unrestricted shell access.
3. Evidence before completion.
4. Reversible changes by default.
5. Human authority over permissions, secrets, budgets, and deployment.
6. Model-agnostic orchestration.
7. Compounding intelligence without uncontrolled self-modification.

Atlas may improve prompts, policies, tests, indexes, and reusable skills through reviewed changes. It may not silently rewrite its own security boundary, grant itself permissions, rotate secrets, merge protected branches, or deploy itself.

## Platform layers

### 1. Atlas Desktop

- Tauri desktop host.
- Monaco editor.
- Repository explorer and global search.
- Integrated terminal and process manager.
- Git graph, changes, review, branch, commit, merge, and worktree views.
- Agent activity timeline.
- Approval center for sensitive actions.
- Live application preview and browser automation panel.

### 2. Workspace Runtime

- Trusted-workspace registry.
- Filesystem service with path and symlink containment.
- File watcher and content hashing.
- Process sandbox and terminal lifecycle.
- Git adapter.
- Language-server and diagnostics gateway.
- Secret redaction and policy enforcement.
- Artifact store for patches, logs, screenshots, plans, tests, and builds.

### 3. Context Engine

- Repository map and symbol graph.
- Semantic and lexical code search.
- Dependency and call graphs.
- Git history and ownership context.
- Issue and pull-request context.
- Runtime logs, diagnostics, and test failures.
- User decisions and architecture records.
- Context freshness, source attribution, and token-budget controls.

### 4. Agent Runtime

- Planner agent.
- Repository researcher.
- Implementation agent.
- Test and verification agent.
- Security reviewer.
- Performance reviewer.
- Documentation agent.
- Release agent.

Agents communicate through typed tasks, artifacts, decisions, and results. No agent receives unrestricted authority by default.

### 5. Orchestrator

- Goal decomposition.
- Dependency-aware task graph.
- Parallel worktree execution.
- Model routing by task, cost, latency, and quality.
- Retry and fallback policy.
- Budget and time limits.
- Approval gates.
- Deadlock and loop detection.
- Final evidence aggregation.

### 6. Verification Plane

- Type checking.
- Linting.
- Unit, integration, end-to-end, and visual tests.
- Static analysis and dependency scanning.
- Browser and API smoke tests.
- Performance budgets.
- Regression comparison.
- Required evidence policy before a task can be marked complete.

### 7. Delivery Plane

- Branch and worktree management.
- Atomic commits.
- Pull-request creation and review summaries.
- CI orchestration.
- Preview environments.
- Release notes.
- Deployment approval and rollback.
- Production observation with explicit permissions.

### 8. Learning and Improvement Plane

- Failure taxonomy.
- Prompt and policy evaluations.
- Reusable skill extraction.
- Repository-specific conventions.
- Benchmark suites.
- Model-routing analytics.
- Reviewed improvement proposals.

This is the safe version of a self-improving engineering system: Atlas learns from evidence and proposes versioned improvements that pass the same review and verification rules as every other change.

## Core product experiences

### Command Center

One screen showing goals, active tasks, agents, costs, approvals, failures, tests, branches, and deployment state.

### Ask, Plan, Build, Verify, Ship

Every significant request moves through a visible lifecycle:

1. Understand the request.
2. Inspect the repository.
3. Propose a plan and risk level.
4. Execute in an isolated branch or worktree.
5. Verify with required checks.
6. Present the diff and evidence.
7. Request approval where required.
8. Commit, open a pull request, or deploy.

### Multi-agent engineering room

Users can watch specialized agents debate architecture, implementation, testing, security, and release concerns. The orchestrator records decisions instead of exposing hidden reasoning.

### Repository intelligence

Atlas should answer architectural questions with exact files, symbols, dependencies, history, tests, and runtime evidence rather than generic model guesses.

### Visual builder and runtime preview

Atlas can generate and modify interfaces while displaying the running application, DOM state, network calls, console logs, screenshots, accessibility findings, and visual diffs.

## Autonomy levels

- Level 0: Explain only.
- Level 1: Suggest edits and commands.
- Level 2: Apply edits with per-action approval.
- Level 3: Execute approved task plans inside a branch or worktree.
- Level 4: Open pull requests and repair failures within policy.
- Level 5: Operate scheduled maintenance and delivery workflows with explicit repository policies.

There is no unrestricted level. Security policy, credentials, billing, protected branches, and production deployment always remain externally governed.

## Commercial product tiers

### Atlas Local

Local IDE, repository intelligence, local models, manual approvals, Git workflow, and basic agents.

### Atlas Pro

Premium models, multi-agent execution, browser automation, cloud sync, advanced evaluations, and larger context indexes.

### Atlas Teams

Shared policies, role-based access, organization knowledge, audit trails, pull-request workflows, usage controls, and team analytics.

### Atlas Enterprise

Single sign-on, private model gateways, self-hosted control plane, compliance exports, policy packs, data residency, and custom retention.

## Defensibility

The moat is the accumulated execution graph: repository knowledge, verified task outcomes, reusable engineering skills, organization policies, failure data, evaluation suites, and delivery integrations. The user interface can be copied. Reliable evidence-backed execution across thousands of repositories is much harder to copy.
