"""
Run exactly one AI CTO queue task and exit.
Outputs a JSON object suitable for API consumption.
"""

import json
import sys
import time
import traceback
from pathlib import Path

_ENGINE_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _ENGINE_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from engine.ai_agent import execute_task, fetch_next_task  # noqa: E402


def main() -> int:
    started = time.monotonic()
    task = fetch_next_task()

    if not task:
        duration_ms = (time.monotonic() - started) * 1000
        print(json.dumps({
            "status": "idle",
            "message": "No queued CTO tasks found.",
            "duration_ms": round(duration_ms, 1),
        }))
        return 0

    try:
        execute_task(task)
        duration_ms = (time.monotonic() - started) * 1000
        print(json.dumps({
            "status": "completed",
            "task": task,
            "duration_ms": round(duration_ms, 1),
        }))
        return 0
    except Exception as exc:  # noqa: BLE001
        duration_ms = (time.monotonic() - started) * 1000
        print(json.dumps({
            "status": "error",
            "task": task,
            "error": str(exc),
            "traceback": traceback.format_exc(),
            "duration_ms": round(duration_ms, 1),
        }))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
