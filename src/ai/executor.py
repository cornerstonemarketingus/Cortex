"""Safe command executor for repair/autonomy agents.
This module exposes run_command which enforces a whitelist, timeout, and dry-run options.
"""
import subprocess
import shlex
from typing import Tuple

# Basic whitelist — expand as needed. Commands not in this list will be rejected.
_WHITELIST = {
    "git",
    "cmake",
    "cmake.exe",
    "pip",
    "python",
    "powershell",
    "pwsh",
    "cargo",
    "npm",
}

_BLOCKED_TOKENS = {
    "&&",
    "||",
    ";",
    "|",
    ">",
    ">>",
    "<",
    "1>",
    "2>",
    "2>&1",
}

_BLOCKED_PATTERNS = (
    "git reset --hard",
    "git checkout --",
    "git clean -fd",
    "rm -rf",
    "remove-item -recurse",
    "format-volume",
    "shutdown",
)


def _validate_command(cmd: str, parts: list[str]) -> str | None:
    """Return an error string for unsafe commands, otherwise None."""
    lowered = cmd.lower()
    for p in _BLOCKED_PATTERNS:
        if p in lowered:
            return f"Blocked dangerous command pattern: {p}"

    for token in parts:
        if token in _BLOCKED_TOKENS:
            return f"Blocked shell operator token: {token}"

    return None


def run_command(cmd: str, timeout: int = 60, dry_run: bool = False, cwd: str = None) -> Tuple[int, str, str]:
    """Run a command if allowed. Returns (returncode, stdout, stderr)."""
    parts = shlex.split(cmd, posix=False)
    if not parts:
        return (1, "", "empty command")

    validation_error = _validate_command(cmd, parts)
    if validation_error:
        return (1, "", validation_error)

    exe = parts[0]
    base = exe.split("\\\\")[-1].split("/")[-1]
    if base not in _WHITELIST:
        return (1, "", f"Command not whitelisted: {base}")

    if dry_run:
        return (0, "", f"dry-run: {cmd} (cwd: {cwd or 'default'})")

    try:
        bounded_timeout = max(1, min(int(timeout), 300))
        p = subprocess.run(parts, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=bounded_timeout, text=True, cwd=cwd)
        return (p.returncode, p.stdout, p.stderr)
    except subprocess.TimeoutExpired:
        return (124, "", "timeout")
    except Exception as e:
        return (1, "", str(e))
