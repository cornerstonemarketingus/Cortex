import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from .utils import BASE_DIR, read_file, write_file


QUEUE_PATH = BASE_DIR / "apps" / "current_app" / "tasks" / "task_queue.json"

# Lower number = higher priority
PRIORITY_ORDER = {
  "bugfix": 0,
  "feature": 1,
  "self-improvement": 2,
}


def _load_raw_queue() -> List[Dict[str, Any]]:
  if not QUEUE_PATH.exists():
    return []
  content = read_file(str(QUEUE_PATH.relative_to(BASE_DIR)))
  try:
    return json.loads(content)
  except json.JSONDecodeError:
    return []


def _save_raw_queue(tasks: List[Dict[str, Any]]) -> None:
  write_file(
    str(QUEUE_PATH.relative_to(BASE_DIR)),
    json.dumps(tasks, indent=2),
  )


def fetch_next_task() -> Optional[Dict[str, Any]]:
  tasks = _load_raw_queue()
  if not tasks:
    return None
  task = tasks.pop(0)
  _save_raw_queue(tasks)
  return task


def fetch_next_task_by_priority() -> Optional[Dict[str, Any]]:
  """
  Fetch and remove the highest-priority task from the queue.
  Priority: bugfix -> feature -> self-improvement.
  """
  tasks = _load_raw_queue()
  if not tasks:
    return None

  def _priority(t: Dict[str, Any]) -> int:
    return PRIORITY_ORDER.get(t.get("type", ""), len(PRIORITY_ORDER))

  # Find index of the highest-priority task
  best_idx = min(range(len(tasks)), key=lambda i: _priority(tasks[i]))
  task = tasks.pop(best_idx)
  _save_raw_queue(tasks)
  return task


def peek_tasks(limit: int = 10) -> List[Dict[str, Any]]:
  return _load_raw_queue()[:limit]


def append_task(task: Dict[str, Any]) -> None:
  """
  Append a new task dictionary to the end of the queue.
  """
  tasks = _load_raw_queue()
  tasks.append(task)
  _save_raw_queue(tasks)


