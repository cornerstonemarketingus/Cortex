"""Python wrapper to call the C++ ai_agent_bridge executable.
Provides run_bridge_command(cmd, dry_run) returning parsed JSON.
"""
import subprocess
import json
import shutil
from typing import Tuple, Dict

def find_bridge_exe():
    # Look in build outputs or repo-local ai_agent_bridge
    candidates = [
        "./build/Debug/ai_agent_bridge.exe",
        "./build/Debug/ai_agent_bridge",
        "./ai_agent_bridge.exe",
        "./ai_agent_bridge"
    ]
    for c in candidates:
        if shutil.which(c):
            return c
        try:
            with open(c, 'rb'):
                return c
        except Exception:
            pass
    return None


def run_bridge_command(cmd: str, dry_run: bool = True) -> Dict:
    exe = find_bridge_exe()
    if not exe:
        return {"ok": False, "error": "bridge_executable_not_found"}
    args = [exe, "--exec", cmd]
    if dry_run:
        args.append("--dry-run")
    proc = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    out = proc.stdout.strip()
    try:
        return json.loads(out)
    except Exception:
        return {"ok": False, "raw": out, "stderr": proc.stderr}
