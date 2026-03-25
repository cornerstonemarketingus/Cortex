from ..agent_base import AgentBase, register
from ..executor import run_command
import json
import time

MAX_COMMANDS = 5
DEFAULT_TIMEOUT_S = 120


def _coerce_bool(value, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() not in {"false", "0", "no", "off"}
    return bool(value)


def _parse_commands(goal: str) -> list[str]:
    """Extract commands from JSON payload or cmd: lines."""
    goal = (goal or "").strip()
    if not goal:
        return []

    # JSON mode: {"commands": ["npm test", "git status"]}
    try:
        parsed = json.loads(goal)
        if isinstance(parsed, dict) and isinstance(parsed.get("commands"), list):
            commands = [str(c).strip() for c in parsed["commands"] if str(c).strip()]
            return commands[:MAX_COMMANDS]
    except Exception:
        pass

    # Text mode: one command per line prefixed with "cmd:"
    commands: list[str] = []
    for line in goal.splitlines():
        s = line.strip()
        if s.lower().startswith("cmd:"):
            cmd = s[4:].strip()
            if cmd:
                commands.append(cmd)
    return commands[:MAX_COMMANDS]


def _preview_commands(commands: list[str], cwd: str = None) -> list[dict]:
    previews = []
    for cmd in commands:
        code, stdout, stderr = run_command(cmd, dry_run=True, cwd=cwd)
        previews.append({
            "command": cmd,
            "exit_code": code,
            "stdout": stdout,
            "stderr": stderr,
        })
    return previews

@register
class CodeAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="CodeAgent", description="Makes code changes and suggestions", prompt_template="{goal}\n{context}")

    def run(self, context):
        goal = str(context.get("goal", "")).strip()
        mode = str(context.get("mode", "propose")).strip().lower()
        cwd = context.get("cwd")  # Optional workspace root
        dry_run = _coerce_bool(context.get("dry_run", True), default=True)
        timeout_s = int(context.get("timeout", DEFAULT_TIMEOUT_S))
        proposal_id = str(context.get("proposal_id") or f"proposal-{int(time.time() * 1000)}")
        commands = _parse_commands(goal)

        if not commands:
            return {
                "action": "proposal",
                "proposal_id": proposal_id,
                "mode": mode,
                "dry_run": True,
                "commands": [],
                "summary": "No executable commands found.",
                "accepted_formats": [
                    '{"commands": ["npm run lint", "python -m pytest tests/test_engine_checks.py"]}',
                    'cmd: npm run lint\\ncmd: python -m pytest tests/test_engine_checks.py',
                ],
                "approval_required": True,
            }

        if mode != "apply" or dry_run:
            return {
                "action": "proposal",
                "proposal_id": proposal_id,
                "mode": "propose",
                "dry_run": True,
                "commands": commands,
                "preview": _preview_commands(commands, cwd=cwd),
                "approval_required": True,
                "next_step": "Re-run with mode=apply and dryRun=false after human approval.",
            }

        # mode=apply with dry_run=false executes commands via safe executor
        results = []
        for cmd in commands:
            code, stdout, stderr = run_command(cmd, timeout=timeout_s, dry_run=False, cwd=cwd)
            results.append({
                "command": cmd,
                "exit_code": code,
                "stdout": stdout[-4000:],
                "stderr": stderr[-4000:],
            })

        failed = sum(1 for r in results if r["exit_code"] != 0)
        return {
            "action": "apply",
            "proposal_id": proposal_id,
            "mode": "apply",
            "dry_run": False,
            "status": "error" if failed else "success",
            "executed_count": len(results),
            "failed_count": failed,
            "results": results,
            "approval_required": False,
        }
