import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List


BASE_DIR = Path(__file__).resolve().parents[1]


def to_abs(path: str | Path) -> Path:
  """Resolve a path relative to the ai-cto-platform root."""
  p = Path(path)
  if not p.is_absolute():
    p = BASE_DIR / p
  return p


def read_file(path: str | Path) -> str:
  target = to_abs(path)
  return target.read_text(encoding="utf-8")


def write_file(path: str | Path, content: str) -> None:
  target = to_abs(path)
  target.parent.mkdir(parents=True, exist_ok=True)
  target.write_text(content, encoding="utf-8")


def create_file(path: str | Path, content: str) -> None:
  """
  Create or overwrite a file with the given content.
  For idempotent scaffolding we allow overwrite instead of strict 'x' create.
  """
  target = to_abs(path)
  target.parent.mkdir(parents=True, exist_ok=True)
  target.write_text(content, encoding="utf-8")


def apply_patch(diff: str) -> None:
  """
  Apply a unified diff patch string.

  This is a minimal implementation that shells out to `patch` if available.
  It can be replaced by a pure-Python patch engine later.
  """
  try:
    subprocess.run(
      ["patch", "-p0"],
      input=diff.encode("utf-8"),
      cwd=str(BASE_DIR),
      check=True,
      stdout=subprocess.PIPE,
      stderr=subprocess.PIPE,
    )
  except FileNotFoundError:
    raise RuntimeError("`patch` command not available; apply_patch is not implemented.")
  except subprocess.CalledProcessError as e:  # noqa: BLE001
    raise RuntimeError(f"Failed to apply patch: {e.stderr.decode('utf-8', errors='ignore')}")


def search_code(query: str) -> List[Path]:
  """
  Very simple grep-style search over the ai-cto-platform tree.
  Returns a list of file paths that contain the query string.
  """
  matches: List[Path] = []
  for root, _, files in os.walk(BASE_DIR):
    for name in files:
      if name.endswith((".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md")):
        file_path = Path(root) / name
        try:
          text = file_path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
          continue
        if query in text:
          matches.append(file_path)
  return matches


@dataclass
class BuildResult:
  success: bool
  output: str


@dataclass
class TestResults:
  passed: bool
  output: str


def run_build() -> BuildResult:
  """
  Run the build command for the current app.
  This is a placeholder that can be wired to your real build pipeline.
  """
  app_root = BASE_DIR.parent  # assume ai-cto-platform lives inside the main repo
  result = subprocess.run(
    ["npm", "run", "build"],
    cwd=str(app_root),
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
  )
  output = result.stdout.decode("utf-8", errors="ignore")
  build_result = BuildResult(success=result.returncode == 0, output=output)
  log_action(f"run_build: success={build_result.success}", "INFO")
  return build_result


def run_tests() -> TestResults:
  """
  Run tests and return a simple result object.
  Wire this to your real test command (e.g. `npm test` or `pytest`).
  """
  app_root = BASE_DIR.parent
  proc = subprocess.run(
    ["npm", "test"],
    cwd=str(app_root),
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
  )
  output = proc.stdout.decode("utf-8", errors="ignore")
  passed = proc.returncode == 0
  results = TestResults(passed=passed, output=output)
  log_action(f"run_tests: passed={results.passed}", "INFO")
  return results


def deploy_preview(description: str | None = None) -> None:
  """
  Build a containerized preview environment.
  Placeholder: write a marker file under /previews.
  """
  previews_dir = BASE_DIR / "previews"
  previews_dir.mkdir(parents=True, exist_ok=True)
  marker = previews_dir / "latest_preview.txt"
  text = f"Preview build created.\n{description or ''}\n"
  marker.write_text(text, encoding="utf-8")
  log_action(f"deploy_preview: {description or 'no description'}", "INFO")


def commit_changes(message: str | None = None) -> None:
  """
  Commit changes to git.
  This is deliberately conservative: it stages the ai-cto-platform subtree only.
  """
  app_root = BASE_DIR.parent
  subprocess.run(["git", "add", "ai-cto-platform"], cwd=str(app_root), check=False)
  commit_message = message or "AI-CTO: automated task update"
  subprocess.run(
    ["git", "commit", "-m", commit_message],
    cwd=str(app_root),
    check=False,
  )
  log_action(f"commit_changes: {commit_message}", "INFO")


def log_action(message: str, level: str = "INFO") -> None:
  logs_dir = BASE_DIR / "logs"
  logs_dir.mkdir(parents=True, exist_ok=True)
  log_path = logs_dir / "agent_actions.log"
  with open(log_path, "a", encoding="utf-8") as f:
    f.write(f"[{level}] {message}\n")

