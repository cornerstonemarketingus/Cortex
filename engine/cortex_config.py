"""
Cortex runtime configuration.
Loads and validates environment variables. Never logs key values — only presence.

Usage:
    from cortex_config import PROMPT_MAX_CHARS, MAX_RETRIES, get_api_key, check_env
"""
import os
from typing import Optional

# ---------------------------------------------------------------------------
# Tunables — all overridable via environment variables
# ---------------------------------------------------------------------------

PROMPT_MAX_CHARS: int = int(os.environ.get("CORTEX_PROMPT_MAX_CHARS", "8000"))
RATE_LIMIT_RPM: int = int(os.environ.get("CORTEX_RATE_LIMIT_RPM", "60"))
DEFAULT_MODEL: str = os.environ.get("CORTEX_MODEL", "gpt-4o-mini")
AGENT_TIMEOUT_S: int = int(os.environ.get("CORTEX_AGENT_TIMEOUT_S", "30"))
MAX_RETRIES: int = int(os.environ.get("CORTEX_MAX_RETRIES", "3"))

# ---------------------------------------------------------------------------
# API key registry (add providers here as they are integrated)
# ---------------------------------------------------------------------------

_PROVIDER_KEYS: dict[str, str] = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
}


def get_api_key(provider: str = "openai") -> Optional[str]:
    """Return the API key for the given provider, or None if not set."""
    env_var = _PROVIDER_KEYS.get(provider.lower())
    return os.environ.get(env_var) if env_var else None


def check_env() -> dict:
    """
    Return a dictionary describing the current config state.
    Safe to log — never includes key values, only boolean presence flags.
    """
    status: dict = {}
    for provider, env_var in _PROVIDER_KEYS.items():
        status[f"{provider}_key_set"] = bool(os.environ.get(env_var))
    status["has_any_key"] = any(
        status[f"{p}_key_set"] for p in _PROVIDER_KEYS
    )
    status["model"] = DEFAULT_MODEL
    status["rate_limit_rpm"] = RATE_LIMIT_RPM
    status["prompt_max_chars"] = PROMPT_MAX_CHARS
    status["agent_timeout_s"] = AGENT_TIMEOUT_S
    status["max_retries"] = MAX_RETRIES
    return status
