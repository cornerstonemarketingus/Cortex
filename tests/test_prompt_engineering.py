from pathlib import Path
import importlib.util


def _load_prompt_module():
    module_path = Path(__file__).resolve().parents[1] / "src" / "platform" / "prompt-engineering.ts"
    assert module_path.exists(), "prompt-engineering.ts must exist"


def test_prompt_engineering_file_exists():
    _load_prompt_module()


def test_platform_api_routes_exist():
    root = Path(__file__).resolve().parents[1]
    required = [
        root / "app" / "api" / "platform" / "orchestrate" / "route.ts",
        root / "app" / "api" / "platform" / "approvals" / "route.ts",
        root / "app" / "api" / "platform" / "data" / "ingest" / "route.ts",
        root / "app" / "api" / "platform" / "data" / "query" / "route.ts",
        root / "app" / "api" / "platform" / "growth" / "route.ts",
    ]

    missing = [str(path) for path in required if not path.exists()]
    assert not missing, f"Missing required platform routes: {missing}"
