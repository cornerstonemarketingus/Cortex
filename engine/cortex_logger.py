"""
Structured JSON logger for Cortex engine runtime events.
All entries are NDJSON (one JSON object per line) for easy grep/parse.

Log files:
  logs/cortex.log      — general events, agent runs, errors
  logs/api_usage.log   — per-call token/provider usage tracking
"""
import json
import time
import os
from pathlib import Path

_LOG_DIR = Path(os.environ.get("CORTEX_LOG_DIR", "logs"))
_MAIN_LOG = _LOG_DIR / "cortex.log"
_USAGE_LOG = _LOG_DIR / "api_usage.log"


def _write(path: Path, entry: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def log_event(event: str, **kwargs) -> None:
    """Log a general runtime event."""
    _write(_MAIN_LOG, {"ts": round(time.time(), 3), "event": event, **kwargs})


def log_agent_run(
    agent: str,
    task_len: int,
    duration_ms: float,
    status: str,
    result_len: int,
) -> None:
    """Log a completed agent execution with timing metrics."""
    _write(_MAIN_LOG, {
        "ts": round(time.time(), 3),
        "event": "agent_run",
        "agent": agent,
        "task_len": task_len,
        "duration_ms": round(duration_ms, 1),
        "status": status,
        "result_len": result_len,
    })


def log_api_usage(
    agent: str,
    provider: str,
    model: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
) -> None:
    """Track per-call token usage for billing/quota monitoring."""
    _write(_USAGE_LOG, {
        "ts": round(time.time(), 3),
        "agent": agent,
        "provider": provider,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
    })


def log_error(component: str, error: str, **kwargs) -> None:
    """Log an error with component context."""
    _write(_MAIN_LOG, {
        "ts": round(time.time(), 3),
        "event": "error",
        "component": component,
        "error": error,
        **kwargs,
    })


def log_prompt_truncated(agent: str, original_len: int, limit: int) -> None:
    """Log when a prompt is truncated due to size limit."""
    _write(_MAIN_LOG, {
        "ts": round(time.time(), 3),
        "event": "prompt_truncated",
        "agent": agent,
        "original_len": original_len,
        "limit": limit,
    })
