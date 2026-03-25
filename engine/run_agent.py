"""
Cortex AI Agent Runner
Usage: python engine/run_agent.py --agent <type> --task <task_text>
Outputs: JSON { "agent": str, "result": str, "status": "success"|"error", "duration_ms": float }

Safety:
  - Prompt size is capped at CORTEX_PROMPT_MAX_CHARS (default 8000) to prevent oversized requests.
  - Failed invocations are retried up to CORTEX_MAX_RETRIES times with exponential backoff.
  - Every run is logged to logs/cortex.log as structured JSON.
"""
import argparse
import json
import sys
import os
import time

# Ensure both engine/ (for cortex_config/logger) and project root (for src.*) are importable
_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_ENGINE_DIR)
for _p in (_ENGINE_DIR, _PROJECT_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from cortex_config import PROMPT_MAX_CHARS, MAX_RETRIES, AGENT_TIMEOUT_S, check_env  # noqa: E402
from cortex_logger import log_agent_run, log_error, log_event, log_prompt_truncated  # noqa: E402

# Load config at import time so environment is validated before any agent execution.
STARTUP_CONFIG = check_env()

# ---------------------------------------------------------------------------
# Agent registry
# ---------------------------------------------------------------------------

AGENT_DESCRIPTIONS = {
    "code":      "Code analysis and patching agent",
    "doc":       "Documentation writing agent",
    "test":      "Test generation and validation agent",
    "data":      "Data and asset management agent",
    "nlp":       "Natural language processing agent",
    "content":   "Content creation agent",
    "seo":       "SEO analysis and optimization agent",
    "analytics": "Analytics and reporting agent",
    "planning":  "Implementation planning agent",
    "repair":    "Build and environment repair agent",
    "infra":     "Infrastructure management agent",
    "deploy":    "Deployment orchestration agent",
    "monitor":   "Monitoring and alerting agent",
    "ops":       "Operations and runbook agent",
    "rl":        "Reinforcement learning tuning agent",
}

# Aliases map display names → canonical internal type
ALIASES: dict[str, str] = {
    "content":   "nlp",
    "seo":       "nlp",
    "analytics": "data",
}

# System prompts injected into agent context (ready for real LLM integration)
SYSTEM_PROMPTS: dict[str, str] = {
    "nlp":      "You are Cortex Content Agent. Produce clear, structured content for the task.",
    "code":     "You are Cortex Code Agent. Analyse the goal and produce a precise code solution.",
    "doc":      "You are Cortex Doc Agent. Write concise, accurate technical documentation.",
    "test":     "You are Cortex Test Agent. Generate comprehensive, runnable test cases.",
    "data":     "You are Cortex Data Agent. Process and summarise data clearly.",
    "planning": "You are Cortex Planning Agent. Create actionable, step-by-step implementation plans.",
    "repair":   "You are Cortex Repair Agent. Diagnose and safely fix build/environment issues.",
    "infra":    "You are Cortex Infra Agent. Manage infrastructure reliably with minimal blast radius.",
    "deploy":   "You are Cortex Deploy Agent. Orchestrate deployments safely with rollback awareness.",
    "monitor":  "You are Cortex Monitor Agent. Track and report system health clearly.",
    "ops":      "You are Cortex Ops Agent. Execute operational runbooks precisely.",
    "rl":       "You are Cortex RL Agent. Tune model/system parameters methodically.",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _enforce_prompt_limit(agent_type: str, task: str) -> str:
    """Truncate task to PROMPT_MAX_CHARS and log when truncation occurs."""
    if len(task) > PROMPT_MAX_CHARS:
        log_prompt_truncated(agent_type, len(task), PROMPT_MAX_CHARS)
        return task[:PROMPT_MAX_CHARS] + f"\n[prompt truncated at {PROMPT_MAX_CHARS} chars]"
    return task


def _build_context(canonical: str, task: str, mode: str, dry_run: bool, timeout_s: int, cwd: str = None) -> dict:
    return {
        "goal": task,
        "context": "",
        "system_prompt": SYSTEM_PROMPTS.get(canonical, ""),
        "mode": mode,
        "dry_run": dry_run,
        "timeout": timeout_s,
        "cwd": cwd,
    }


def _invoke_agent(canonical: str, task: str, mode: str, dry_run: bool, timeout_s: int, cwd: str = None) -> dict:
    """Dispatch to the correct agent class. Returns a result dict."""
    ctx = _build_context(canonical, task, mode, dry_run, timeout_s, cwd)
    if canonical == "code":
        from src.ai.agents.code_agent import CodeAgent
        return CodeAgent().run({**ctx, "files": []})
    elif canonical == "doc":
        from src.ai.agents.doc_agent import DocAgent
        return DocAgent().run(ctx)
    elif canonical == "test":
        from src.ai.agents.test_agent import TestAgent
        return TestAgent().run(ctx)
    elif canonical == "data":
        from src.ai.agents.data_agent import DataAgent
        return DataAgent().run(ctx)
    elif canonical == "nlp":
        from src.ai.agents.nlp_agent import NLPAgent
        return NLPAgent().run(ctx)
    elif canonical == "planning":
        from src.ai.agents.planning_agent import PlanningAgent
        return PlanningAgent().run(ctx)
    elif canonical == "repair":
        from src.ai.agents.repair_agent import RepairAgent
        return RepairAgent().run(ctx)
    elif canonical == "infra":
        from src.ai.agents.infra_agent import InfraAgent
        return InfraAgent().run(ctx)
    elif canonical == "deploy":
        from src.ai.agents.deploy_agent import DeployAgent
        return DeployAgent().run(ctx)
    elif canonical == "monitor":
        from src.ai.agents.monitor_agent import MonitorAgent
        return MonitorAgent().run(ctx)
    elif canonical == "ops":
        from src.ai.agents.ops_agent import OpsAgent
        return OpsAgent().run(ctx)
    elif canonical == "rl":
        from src.ai.agents.rl_agent import RLAgent
        return RLAgent().run(ctx)
    else:
        raise ValueError(f"Unknown canonical agent type: {canonical}")

# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_agent(agent_type: str, task: str, mode: str = "propose", dry_run: bool = True, cwd: str = None) -> dict:
    """
    Run the named agent with retry + exponential backoff.
    Returns { agent, status, result, duration_ms } where status is success|error.
    """
    canonical = ALIASES.get(agent_type, agent_type)
    task = _enforce_prompt_limit(agent_type, task)

    t0 = time.monotonic()
    last_error = ""

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            raw = _invoke_agent(canonical, task, mode, dry_run, AGENT_TIMEOUT_S, cwd)
            duration_ms = (time.monotonic() - t0) * 1000
            result_str = json.dumps(raw) if isinstance(raw, dict) else str(raw)

            runner_status = "success"
            if isinstance(raw, dict) and str(raw.get("status", "")).lower() == "error":
                runner_status = "error"

            log_agent_run(agent_type, len(task), duration_ms, runner_status, len(result_str))
            return {
                "agent": agent_type,
                "status": runner_status,
                "result": result_str,
                "duration_ms": round(duration_ms, 1),
                "mode": mode,
                "dry_run": dry_run,
            }
        except Exception as exc:
            last_error = str(exc)
            log_error("run_agent", last_error, agent=agent_type, attempt=attempt)
            if attempt < MAX_RETRIES:
                backoff = 2 ** (attempt - 1)   # 1s → 2s → …
                log_event("retry", agent=agent_type, attempt=attempt, backoff_s=backoff)
                time.sleep(backoff)

    duration_ms = (time.monotonic() - t0) * 1000
    log_agent_run(agent_type, len(task), duration_ms, "error", 0)
    return {
        "agent": agent_type,
        "status": "error",
        "result": last_error,
        "duration_ms": round(duration_ms, 1),
        "mode": mode,
        "dry_run": dry_run,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Cortex Agent Runner")
    parser.add_argument(
        "--agent", required=True,
        choices=list(AGENT_DESCRIPTIONS.keys()),
        help="Agent type to run",
    )
    parser.add_argument("--task", required=True, help="Task description (max 8000 chars)")
    parser.add_argument("--mode", choices=["propose", "apply"], default="propose", help="Execution mode")
    parser.add_argument("--dry-run", dest="dry_run", action="store_true", help="Force dry-run execution")
    parser.add_argument("--no-dry-run", dest="dry_run", action="store_false", help="Allow real execution")
    parser.add_argument("--cwd", help="Working directory for the agent execution", default=None)
    parser.set_defaults(dry_run=True)
    args = parser.parse_args()

    cfg = STARTUP_CONFIG
    log_event("agent_start", agent=args.agent, config=cfg)

    if not cfg.get("has_any_key"):
        log_event("warning", msg="No AI provider API key found — agents will return stub results")

    output = run_agent(args.agent, args.task, mode=args.mode, dry_run=args.dry_run, cwd=args.cwd)
    print(json.dumps(output))


if __name__ == "__main__":
    main()

