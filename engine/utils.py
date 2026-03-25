import json
import os
import sys
import time
import subprocess
from pathlib import Path

# Fix path to allow importing from src (sibling of engine)
_ENGINE_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _ENGINE_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# Attempt to import safe executor, fall back to subprocess if fails
try:
    from src.ai.executor import run_command as _safe_run_command
except ImportError:
    _safe_run_command = None

# Paths
BASE_DIR = _PROJECT_ROOT
LOG_FILE = BASE_DIR / "engine" / "logs" / "actions.log"
APP_DIR = BASE_DIR / "apps" / "current_app"


class BuildResult:
    def __init__(self, success: bool, output: str = ""):
        self.success = success
        self.output = output


class TestResult:
    def __init__(self, passed: bool, output: str = ""):
        self.passed = passed
        self.output = output


def log_action(message: str, level: str = "INFO") -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [{level}] {message}"
    print(formatted)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(formatted + "\n")


def read_file(path: str) -> str:
    p = BASE_DIR / path
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8")


def write_file(path: str, content: str) -> None:
    p = BASE_DIR / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def create_file(path: str, content: str) -> None:
    """Explicit alias for write_file to match agent expectations."""
    write_file(path, content)


def search_code(query: str) -> list:
    """Basic grep-like search."""
    # In a real system, this would use grep or semantic search
    results = []
    # Simplified: just look in APP_DIR
    if APP_DIR.exists():
        for f in APP_DIR.rglob("*.py"):
            if query in f.read_text(encoding="utf-8", errors="ignore"):
                results.append(str(f.relative_to(BASE_DIR)))
    return results


def run_build() -> BuildResult:
    """Run build command in the app directory."""
    # Detect build system
    package_json = APP_DIR / "package.json"
    requirements = APP_DIR / "requirements.txt"
    
    if not APP_DIR.exists():
        return BuildResult(True, "No app directory to build yet.")

    cmd = None
    if package_json.exists():
        cmd = "npm run build"
    elif requirements.exists():
        # Python projects don't always "build", but we can check syntax or install deps
        cmd = "python -m compileall ."
    
    if not cmd:
        return BuildResult(True, "No build definition found, skipping.")

    log_action(f"Running build: {cmd}")
    
    if _safe_run_command:
        # Use safe executor
        code, stdout, stderr = _safe_run_command(cmd, cwd=str(APP_DIR))
        success = (code == 0)
        output = stdout + stderr
    else:
        # Fallback
        res = subprocess.run(cmd, shell=True, cwd=str(APP_DIR), capture_output=True, text=True)
        success = (res.returncode == 0)
        output = res.stdout + res.stderr

    return BuildResult(success, output)


def run_tests() -> TestResult:
    """Run tests in the app directory."""
    if not APP_DIR.exists():
        return TestResult(True, "No app directory to test yet.")

    has_node_project = (APP_DIR / "package.json").exists()
    if has_node_project:
        cmd = "npm test"
    else:
        py_tests = list(APP_DIR.rglob("test_*.py")) + list(APP_DIR.rglob("*_test.py"))
        if not py_tests:
            return TestResult(True, "No tests found in app workspace, skipping.")
        cmd = "python -m pytest"
    
    # Check if test runner actually exists/configured, otherwise skip to avoid false failures
    # (Simplified for now, assuming if we trigger this, we expected tests)
    
    log_action(f"Running tests: {cmd}")

    if _safe_run_command:
         # Use safe executor
        code, stdout, stderr = _safe_run_command(cmd, cwd=str(APP_DIR))
        success = (code == 0)
        output = stdout + stderr
    else:
        res = subprocess.run(cmd, shell=True, cwd=str(APP_DIR), capture_output=True, text=True)
        success = (res.returncode == 0)
        output = res.stdout + res.stderr

    return TestResult(success, output)


def deploy_preview(message: str) -> None:
    log_action(f"Deploying preview for: {message}")
    # In a real system, this might push to Vercel/Netlify or a staging server


def commit_changes(message: str) -> None:
    # Use git to commit changes in the APP_DIR
    if (APP_DIR / ".git").exists():
        log_action(f"Committing changes: {message}")
        subprocess.run(f'git add . && git commit -m "{message}"', shell=True, cwd=str(APP_DIR))
    else:
        log_action(f"Skipping commit (no git repo): {message}")



def log(msg):
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(LOG_FILE, "a") as f:
        f.write(msg + "\n")