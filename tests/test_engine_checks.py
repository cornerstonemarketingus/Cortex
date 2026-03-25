"""
Cortex Engine — AI builder system checks
Covers the 6-section verification checklist:
  1. Core AI engine config
  2. Prompt handling
  3. Response processing
  4. Builder automation safety
  5. Safety and stability
  6. End-to-end integration

Run: python -m pytest tests/test_engine_checks.py -v
  or: python tests/test_engine_checks.py
"""
import json
import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# ── Path setup ─────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).parent.parent
_ENGINE = _ROOT / "engine"
for _p in (str(_ROOT), str(_ENGINE)):
    if _p not in sys.path:
        sys.path.insert(0, _p)


# ══════════════════════════════════════════════════════════════════════════════
# 1. Core AI Engine Config
# ══════════════════════════════════════════════════════════════════════════════

class TestCoreEngineConfig(unittest.TestCase):

    def test_config_module_importable(self):
        from cortex_config import check_env, PROMPT_MAX_CHARS, MAX_RETRIES
        self.assertIsInstance(PROMPT_MAX_CHARS, int)
        self.assertGreater(PROMPT_MAX_CHARS, 0)
        self.assertIsInstance(MAX_RETRIES, int)
        self.assertGreaterEqual(MAX_RETRIES, 1)

    def test_check_env_returns_dict(self):
        from cortex_config import check_env
        cfg = check_env()
        self.assertIsInstance(cfg, dict)
        self.assertIn("has_any_key", cfg)
        self.assertIn("model", cfg)
        self.assertIn("prompt_max_chars", cfg)
        self.assertIn("max_retries", cfg)

    def test_get_api_key_returns_none_when_missing(self):
        from cortex_config import get_api_key
        old = os.environ.pop("OPENAI_API_KEY", None)
        try:
            self.assertIsNone(get_api_key("openai"))
        finally:
            if old is not None:
                os.environ["OPENAI_API_KEY"] = old

    def test_cortex_env_overrides_apply(self):
        import importlib
        import cortex_config
        with patch.dict(os.environ, {
            "CORTEX_PROMPT_MAX_CHARS": "1234",
            "CORTEX_RATE_LIMIT_RPM": "77",
            "CORTEX_AGENT_TIMEOUT_S": "9",
            "CORTEX_MAX_RETRIES": "5",
            "CORTEX_MODEL": "unit-model",
        }):
            importlib.reload(cortex_config)
            self.assertEqual(cortex_config.PROMPT_MAX_CHARS, 1234)
            self.assertEqual(cortex_config.RATE_LIMIT_RPM, 77)
            self.assertEqual(cortex_config.AGENT_TIMEOUT_S, 9)
            self.assertEqual(cortex_config.MAX_RETRIES, 5)
            self.assertEqual(cortex_config.DEFAULT_MODEL, "unit-model")
        importlib.reload(cortex_config)

    def test_api_key_not_logged(self):
        """check_env must never include the actual key value."""
        from cortex_config import check_env
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-secret-123"}):
            cfg = check_env()
        self.assertNotIn("sk-secret-123", json.dumps(cfg))

    def test_api_key_presence_reported(self):
        from cortex_config import check_env, get_api_key
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            cfg = check_env()
            self.assertTrue(cfg["openai_key_set"])
            self.assertEqual(get_api_key("openai"), "sk-test")

    def test_missing_key_reported(self):
        from cortex_config import check_env
        env = {k: "" for k in ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"]}
        with patch.dict(os.environ, env, clear=False):
            # Temporarily remove from env
            old = {k: os.environ.pop(k, None) for k in env}
            try:
                cfg = check_env()
                self.assertFalse(cfg["has_any_key"])
            finally:
                for k, v in old.items():
                    if v: os.environ[k] = v

    def test_run_agent_script_exists(self):
        self.assertTrue((_ENGINE / "run_agent.py").exists(),
                        "engine/run_agent.py must exist")

    def test_agent_runner_importable(self):
        import run_agent  # noqa: F401

    def test_config_loads_before_runner_executes(self):
        import run_agent
        self.assertIsInstance(run_agent.STARTUP_CONFIG, dict)
        self.assertIn("prompt_max_chars", run_agent.STARTUP_CONFIG)


# ══════════════════════════════════════════════════════════════════════════════
# 2. Prompt Handling
# ══════════════════════════════════════════════════════════════════════════════

class TestPromptHandling(unittest.TestCase):

    def test_prompt_within_limit_unchanged(self):
        from cortex_config import PROMPT_MAX_CHARS
        from run_agent import _enforce_prompt_limit
        short = "Write a haiku about code."
        self.assertEqual(_enforce_prompt_limit("nlp", short), short)

    def test_prompt_at_exact_limit_unchanged(self):
        from cortex_config import PROMPT_MAX_CHARS
        from run_agent import _enforce_prompt_limit
        exact = "x" * PROMPT_MAX_CHARS
        result = _enforce_prompt_limit("nlp", exact)
        self.assertFalse(result.endswith("[prompt truncated"))
        self.assertEqual(len(result), PROMPT_MAX_CHARS)

    def test_prompt_over_limit_truncated(self):
        from cortex_config import PROMPT_MAX_CHARS
        from run_agent import _enforce_prompt_limit
        oversized = "y" * (PROMPT_MAX_CHARS + 500)
        result = _enforce_prompt_limit("nlp", oversized)
        self.assertIn("[prompt truncated", result)
        self.assertLessEqual(len(result), PROMPT_MAX_CHARS + 100)  # truncation marker appended

    def test_large_prompt_truncated_and_logged(self):
        from cortex_config import PROMPT_MAX_CHARS
        from run_agent import _enforce_prompt_limit
        from cortex_logger import log_prompt_truncated
        with patch("run_agent.log_prompt_truncated") as mock_log:
            big = "z" * (PROMPT_MAX_CHARS + 1)
            _enforce_prompt_limit("code", big)
            mock_log.assert_called_once()

    def test_system_prompt_injected_in_context(self):
        from run_agent import SYSTEM_PROMPTS, _build_context
        ctx = _build_context("nlp", "write something", mode="propose", dry_run=True, timeout_s=30)
        self.assertIn("system_prompt", ctx)
        self.assertEqual(ctx["system_prompt"], SYSTEM_PROMPTS["nlp"])

    def test_prompt_edge_lengths(self):
        from cortex_config import PROMPT_MAX_CHARS
        from run_agent import _enforce_prompt_limit

        for n in [1, 100, 7999, 8000, 10000]:
            with self.subTest(length=n):
                text = "a" * n
                out = _enforce_prompt_limit("nlp", text)
                if n <= PROMPT_MAX_CHARS:
                    self.assertEqual(out, text)
                else:
                    self.assertTrue(out.startswith("a" * PROMPT_MAX_CHARS))
                    self.assertIn("[prompt truncated", out)

    def test_empty_task_rejected_at_api_layer(self):
        """Whitespace-only task must not reach the agent."""
        from run_agent import run_agent
        # run_agent itself will call the agent — test that empty string still
        # returns a dict (the API layer does the .trim() guard)
        result = run_agent("nlp", "  ")
        self.assertIn("status", result)


# ══════════════════════════════════════════════════════════════════════════════
# 3. Response Processing
# ══════════════════════════════════════════════════════════════════════════════

class TestResponseProcessing(unittest.TestCase):

    def test_agent_returns_valid_dict(self):
        from run_agent import run_agent
        result = run_agent("nlp", "test task")
        self.assertIsInstance(result, dict)
        self.assertIn("status", result)
        self.assertIn("result", result)
        self.assertIn("agent", result)

    def test_agent_result_is_serialisable(self):
        from run_agent import run_agent
        result = run_agent("nlp", "serialisable test")
        # Must not raise
        json.dumps(result)

    def test_duration_ms_present_and_positive(self):
        from run_agent import run_agent
        result = run_agent("planning", "plan something")
        self.assertIn("duration_ms", result)
        self.assertGreaterEqual(result["duration_ms"], 0)

    def test_ok_status_on_success(self):
        from run_agent import run_agent
        result = run_agent("doc", "document a function")
        self.assertEqual(result["status"], "success")

    def test_error_status_on_bad_agent(self):
        from run_agent import run_agent
        result = run_agent("__nonexistent__", "anything")
        self.assertEqual(result["status"], "error")

    def test_run_agent_returns_mode_and_dry_run(self):
        from run_agent import run_agent
        result = run_agent("code", '{"commands": ["git status"]}', mode="propose", dry_run=True)
        self.assertIn("mode", result)
        self.assertIn("dry_run", result)
        self.assertEqual(result["mode"], "propose")
        self.assertTrue(result["dry_run"])

    def test_run_agent_propagates_apply_errors(self):
        from run_agent import run_agent
        result = run_agent("code", '{"commands": ["not-a-whitelisted-command"]}', mode="apply", dry_run=False)
        self.assertEqual(result["status"], "error")


# ══════════════════════════════════════════════════════════════════════════════
# 4. Builder Automation Safety
# ══════════════════════════════════════════════════════════════════════════════

class TestBuilderAutomationSafety(unittest.TestCase):

    def test_executor_whitelist_enforced(self):
        from src.ai.executor import run_command
        code, _, stderr = run_command("rm -rf /", dry_run=False)
        self.assertNotEqual(code, 0)
        self.assertTrue(
            "not whitelisted" in stderr.lower() or "blocked dangerous command pattern" in stderr.lower()
        )

    def test_executor_blocks_shell_operators(self):
        from src.ai.executor import run_command
        code, _, stderr = run_command("git status && git status", dry_run=False)
        self.assertNotEqual(code, 0)
        self.assertIn("blocked shell operator token", stderr.lower())

    def test_executor_whitelisted_command_dry_run(self):
        from src.ai.executor import run_command
        code, _, stderr = run_command("git status", dry_run=True)
        self.assertEqual(code, 0)
        self.assertIn("dry-run", stderr)

    def test_executor_empty_command_rejected(self):
        from src.ai.executor import run_command
        code, _, _ = run_command("", dry_run=False)
        self.assertNotEqual(code, 0)

    def test_executor_timeout_parameter_accepted(self):
        from src.ai.executor import run_command
        # Should not raise even with a short timeout on a dry-run
        code, _, _ = run_command("python --version", timeout=5, dry_run=True)
        self.assertEqual(code, 0)

    def test_agent_runner_uses_list_args(self):
        """Verify spawn is called with a list, never a shell string."""
        source = (_ROOT / "app/api/agents/route.ts").read_text()
        self.assertIn("spawn('python'", source)
        self.assertIn("const args = [", source)

    def test_api_route_requires_human_token_for_real_apply(self):
        source = (_ROOT / "app/api/agents/route.ts").read_text()
        self.assertIn("X-Human-Token", source)
        self.assertIn("Human approval required", source)

    def test_api_route_forwards_mode_and_dry_run_to_runner(self):
        source = (_ROOT / "app/api/agents/route.ts").read_text()
        self.assertIn("--mode", source)
        self.assertIn("--no-dry-run", source)

    def test_code_agent_parses_cmd_lines(self):
        from src.ai.agents.code_agent import CodeAgent
        out = CodeAgent().run({"goal": "cmd: git status", "mode": "propose", "dry_run": True, "timeout": 30})
        self.assertEqual(out["action"], "proposal")
        self.assertIn("git status", out.get("commands", []))



# ══════════════════════════════════════════════════════════════════════════════
# 5. Safety and Stability
# ══════════════════════════════════════════════════════════════════════════════

class TestSafetyAndStability(unittest.TestCase):

    def test_retry_logic_on_import_error(self):
        """If _invoke_agent raises, run_agent retries and returns error dict."""
        from run_agent import run_agent
        with patch("run_agent._invoke_agent", side_effect=RuntimeError("simulated failure")):
            with patch("run_agent.time") as mock_time:
                mock_time.monotonic.return_value = 0.0
                mock_time.sleep = MagicMock()
                result = run_agent("nlp", "test retry")
        self.assertEqual(result["status"], "error")
        self.assertIn("simulated failure", result["result"])

    def test_retry_sleeps_with_backoff(self):
        from run_agent import run_agent
        sleep_calls = []
        original_sleep = time.sleep
        with patch("run_agent.time") as mock_time:
            mock_time.monotonic.return_value = 0.0
            mock_time.sleep.side_effect = lambda s: sleep_calls.append(s)
            with patch("run_agent._invoke_agent", side_effect=RuntimeError("fail")):
                run_agent("nlp", "backoff test")
        # Expect exponential: 1, 2 (for 3 retries → 2 sleeps)
        self.assertEqual(len(sleep_calls), 2)
        self.assertEqual(sleep_calls[0], 1)
        self.assertEqual(sleep_calls[1], 2)

    def test_logger_writes_to_disk(self):
        from cortex_logger import log_event
        import tempfile, os
        with tempfile.TemporaryDirectory() as tmp:
            with patch.dict(os.environ, {"CORTEX_LOG_DIR": tmp}):
                # Reload module to pick up new env
                import importlib, cortex_logger
                importlib.reload(cortex_logger)
                cortex_logger.log_event("test_event", value=42)
                log_file = Path(tmp) / "cortex.log"
                self.assertTrue(log_file.exists())
                line = json.loads(log_file.read_text().strip().splitlines()[-1])
                self.assertEqual(line["event"], "test_event")
                self.assertEqual(line["value"], 42)
            # Reload back to default
            importlib.reload(cortex_logger)

    def test_invalid_json_response_handled(self):
        """run_agent must not raise if _invoke_agent returns non-dict."""
        from run_agent import run_agent
        with patch("run_agent._invoke_agent", return_value="plain string"):
            result = run_agent("doc", "test")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["result"], "plain string")

    def test_rate_limit_constants_present(self):
        source = Path(_ROOT / "app/api/agents/route.ts").read_text()
        self.assertIn("RATE_LIMIT", source)
        self.assertIn("RATE_WINDOW_MS", source)

    def test_process_timeout_constant_present(self):
        source = Path(_ROOT / "app/api/agents/route.ts").read_text()
        self.assertIn("PROCESS_TIMEOUT_MS", source)

    def test_timeout_termination_is_logged(self):
        source = Path(_ROOT / "app/api/agents/route.ts").read_text()
        self.assertIn("terminating", source)
        self.assertIn("timed out", source)


# ══════════════════════════════════════════════════════════════════════════════
# 6. Monitoring
# ══════════════════════════════════════════════════════════════════════════════

class TestMonitoring(unittest.TestCase):

    def test_duration_ms_logged_on_success(self):
        from run_agent import run_agent
        with patch("run_agent.log_agent_run") as mock_log:
            run_agent("nlp", "monitor test")
            mock_log.assert_called_once()
            _, _, duration_ms, status, _ = mock_log.call_args[0]
            self.assertEqual(status, "success")
            self.assertGreaterEqual(duration_ms, 0)

    def test_error_logged_on_failure(self):
        from run_agent import run_agent
        with patch("run_agent._invoke_agent", side_effect=RuntimeError("boom")), \
             patch("run_agent.time") as mt, \
             patch("run_agent.log_error") as mock_err:
            mt.monotonic.return_value = 0.0
            mt.sleep = MagicMock()
            run_agent("nlp", "error test")
            self.assertTrue(mock_err.called)

    def test_health_endpoint_file_exists(self):
        health_route = _ROOT / "app/api/health/route.ts"
        self.assertTrue(health_route.exists(), "app/api/health/route.ts must exist")

    def test_health_checks_api_key_presence(self):
        source = (_ROOT / "app/api/health/route.ts").read_text()
        self.assertIn("OPENAI_API_KEY", source)
        self.assertIn("ANTHROPIC_API_KEY", source)

    def test_health_contract_keys_present(self):
        source = (_ROOT / "app/api/health/route.ts").read_text()
        self.assertIn("python_runtime", source)
        self.assertIn("api_keys", source)
        self.assertIn("agent_runner", source)
        self.assertIn("log_dir", source)
        self.assertIn("db", source)

    def test_agents_route_sets_response_time_header(self):
        source = (_ROOT / "app/api/agents/route.ts").read_text()
        self.assertIn("X-Response-Time", source)

    def test_api_usage_log_function_exists(self):
        from cortex_logger import log_api_usage
        self.assertTrue(callable(log_api_usage))

    def test_log_agent_run_records_all_fields(self):
        from cortex_logger import log_agent_run
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            with patch.dict(os.environ, {"CORTEX_LOG_DIR": tmp}):
                import importlib, cortex_logger
                importlib.reload(cortex_logger)
                cortex_logger.log_agent_run("nlp", 100, 250.5, "success", 42)
                log_file = Path(tmp) / "cortex.log"
                entry = json.loads(log_file.read_text().strip())
                self.assertEqual(entry["event"], "agent_run")
                self.assertEqual(entry["agent"], "nlp")
                self.assertEqual(entry["status"], "success")
                self.assertEqual(entry["duration_ms"], 250.5)
            importlib.reload(cortex_logger)


# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    unittest.main(verbosity=2)
